import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";

import * as mysql from "mysql2/promise";
import { createClient } from "@clickhouse/client";
import { semanticConfigFields } from "./semantic/schema.js";
import { createSemanticRuntime, SemanticApiError } from "./semantic/runtime.js";
import { buildSemanticTools } from "./semantic/tools.js";
//#region lib/types/index.js
/**
* 数据库连接插件 —— host 半部。
*
* 提供：
 * 1. 连接列表的持久化（settings namespace `database-connections`，用户名和密码走
 *    role('secret')，不会被 wire 层的 describe 泄露）。
* 2. /api/database-connections 前缀 HTTP API，供 client 端设置页调用：
*    list / save / delete / test / databases / tables / query / export / import。
* 3. 真实的 MySQL（mysql2）与 ClickHouse（@clickhouse/client）连接、探活与
*    只读查询。
*
* 只读约束：query 仅放行 SELECT / SHOW / DESCRIBE / EXPLAIN / WITH 开头的语句，
* 结果截断到 200 行，避免误执行写操作或拉取巨量数据。
* @module @deepseek-ai/dsh-database-connections
*/
/** 单条连接的 schema（密码标记为 secret，wire 层自动脱敏）。 */
const ConnectionSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	type: z.union([z.const("mysql"), z.const("clickhouse")]),
	host: z.string().min(1),
	port: z.number().min(1).max(65535),
	username: z.string().role("secret"),
	password: z.string().role("secret"),
	database: z.string()
});
/** 配置节 schema。 */
const ConfigSchema = z.object({
	connections: z.array(ConnectionSchema).default([]),
	...semanticConfigFields
});
const NAMESPACE = "database-connections";
const API_PREFIX = "/api/database-connections";
const MAX_ROWS = 200;
const TIMEOUT_MS = 15e3;
const MAX_CONFIG_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ITEMS = 500;
const EXPORT_FORMAT = "dsh-plugin-config";
const EXPORT_FORMAT_VERSION = 1;
const PLUGIN_ID = "@deepseek-ai/dsh-database-connections";
const PLUGIN_VERSION = "2.0.0";
/** 只读 SQL 白名单前缀。 */
const READ_ONLY_PREFIX = /^\s*(select|show|describe|desc|explain|with)\b/i;
/** 判断一个数据库类型是否为已知类型。 */
function isDatabaseKind(value) {
	return value === "mysql" || value === "clickhouse";
}
/** 是否为只读 SQL。 */
function isReadOnly(sql) {
	return READ_ONLY_PREFIX.test(sql);
}
/** 规范化端口：未提供时按类型给默认值。 */
function resolvePort(type, port) {
	if (typeof port === "number" && Number.isInteger(port) && port > 0) return port;
	return type === "mysql" ? 3306 : 8123;
}
/** 把持久化连接转成给 client 的视图（脱敏）。 */
function toView(connection) {
	return {
		id: connection.id,
		name: connection.name,
		type: connection.type,
		host: connection.host,
		port: connection.port,
		database: connection.database,
		hasUsername: connection.username.length > 0,
		hasPassword: connection.password.length > 0
	};
}
/** 统一错误结构。 */
var ApiError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.status = status;
	}
};
/** 读取请求体并解析为 JSON（空 body 视为 {}）。 */
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => {
			data += chunk;
			if (data.length > MAX_CONFIG_DOCUMENT_BYTES) {
				reject(new ApiError(413, "请求体过大"));
				req.destroy();
			}
		});
		req.on("end", () => {
			if (data.trim().length === 0) {
				resolve({});
				return;
			}
			try {
				resolve(JSON.parse(data));
			} catch {
				reject(new ApiError(400, "请求体不是合法 JSON"));
			}
		});
		req.on("error", reject);
	});
}
/** 从请求体读取一条连接信息（client 提交形态，密码可省略）。 */
function readConnection(input) {
	if (typeof input !== "object" || input === null) throw new ApiError(400, "缺少连接信息");
	const record = input;
	const type = record["type"];
	if (!isDatabaseKind(type)) throw new ApiError(400, "type 必须是 mysql 或 clickhouse");
	const name = typeof record["name"] === "string" ? record["name"].trim() : "";
	if (name.length === 0) throw new ApiError(400, "连接名称不能为空");
	const host = typeof record["host"] === "string" ? record["host"].trim() : "";
	if (host.length === 0) throw new ApiError(400, "主机地址不能为空");
	return {
		id: typeof record["id"] === "string" ? record["id"] : "",
		name,
		type,
		host,
		port: resolvePort(type, record["port"]),
		username: typeof record["username"] === "string" ? record["username"] : "",
		password: typeof record["password"] === "string" ? record["password"] : "",
		database: typeof record["database"] === "string" ? record["database"] : ""
	};
}
/** 已保存连接在前端不会回传密码；执行测试/查询时按 id 补回宿主端保存的密码。 */
function readOperationalConnection(scope, input) {
	const connection = readConnection(input);
	if ((connection.password.length > 0 && connection.username.length > 0) || connection.id.length === 0) return connection;
	const existing = scope.get().connections.find((item) => item.id === connection.id);
	return existing === void 0 ? connection : {
		...connection,
		username: connection.username.length > 0 ? connection.username : existing.username,
		password: connection.password.length > 0 ? connection.password : existing.password
	};
}
/** MySQL 连接工厂。 */
async function withMySql(connection, run) {
	const client = await mysql.createConnection({
		host: connection.host,
		port: connection.port,
		user: connection.username,
		password: connection.password,
		...connection.database.length > 0 ? { database: connection.database } : {},
		connectTimeout: TIMEOUT_MS
	});
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}
/** ClickHouse 连接工厂。 */
async function withClickHouse(connection, run) {
	const client = createClient({
		url: /^https?:\/\//.test(connection.host) ? connection.host : `http://${connection.host}:${connection.port}`,
		username: connection.username,
		password: connection.password,
		database: connection.database || "default",
		request_timeout: TIMEOUT_MS
	});
	try {
		return await run(client);
	} finally {
		await client.close();
	}
}
/** 测试一条连接。 */
async function testConnection(connection) {
	if (connection.type === "mysql") {
		await withMySql(connection, async (client) => {
			await client.ping();
		});
		return { message: "MySQL 连接成功" };
	}
	const pingResult = await withClickHouse(connection, async (client) => {
		return await client.ping({ select: true });
	});
	if (!pingResult.success) throw new Error(pingResult.error.message);
	return { message: "ClickHouse 连接成功" };
}
/** 列出数据库。 */
async function listDatabases(connection) {
	if (connection.type === "mysql") return { rows: (await withMySql(connection, async (client) => {
		const [result] = await client.query("SHOW DATABASES");
		return result;
	})).map((row) => String(Object.values(row)[0] ?? "")) };
	return { rows: (await withClickHouse(connection, async (client) => {
		return await (await client.query({
			query: "SELECT name FROM system.databases ORDER BY name",
			format: "JSONEachRow"
		})).json();
	})).map((row) => row.name) };
}
/** 列出某数据库的表。 */
async function listTables(connection, database) {
	if (connection.type === "mysql") {
		const db = database || connection.database;
		if (db.length === 0) throw new ApiError(400, "请先选择数据库");
		return { rows: (await withMySql(connection, async (client) => {
			const [result] = await client.query(`SHOW TABLES FROM \`${db.replace(/`/g, "``")}\``);
			return result;
		})).map((row) => String(Object.values(row)[0] ?? "")) };
	}
	const db = database || connection.database || "default";
	return { rows: (await withClickHouse(connection, async (client) => {
		return await (await client.query({
			query: "SELECT name FROM system.tables WHERE database = {db:String} ORDER BY name",
			query_params: { db },
			format: "JSONEachRow"
		})).json();
	})).map((row) => row.name) };
}
/** 执行只读查询。 */
async function runQuery(connection, sql) {
	if (typeof sql !== "string" || sql.trim().length === 0) throw new ApiError(400, "SQL 不能为空");
	if (!isReadOnly(sql)) throw new ApiError(400, "仅允许 SELECT / SHOW / DESCRIBE / EXPLAIN / WITH 只读查询");
	if (connection.type === "mysql") {
		const rows = await withMySql(connection, async (client) => {
			const [result] = await client.query({
				sql,
				timeout: TIMEOUT_MS
			});
			return result;
		});
		return {
			columns: rows.length > 0 ? Object.keys(rows[0]) : [],
			rows: rows.slice(0, MAX_ROWS)
		};
	}
	const rows = await withClickHouse(connection, async (client) => {
		return await (await client.query({
			query: sql,
			format: "JSONEachRow"
		})).json();
	});
	return {
		columns: rows.length > 0 ? Object.keys(rows[0]) : [],
		rows: rows.slice(0, MAX_ROWS)
	};
}
/** 写入 JSON 响应。 */
function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(body)
	});
	res.end(body);
}

/** 生成不含数据库密码的可迁移配置文件。 */
function createExportDocument(connections) {
	return {
		format: EXPORT_FORMAT,
		formatVersion: EXPORT_FORMAT_VERSION,
		plugin: PLUGIN_ID,
		pluginVersion: PLUGIN_VERSION,
		exportedAt: new Date().toISOString(),
		secretPolicy: "credentials-omitted",
		items: connections.map((connection) => ({
			id: connection.id,
			name: connection.name,
			type: connection.type,
			host: connection.host,
			port: connection.port,
			database: connection.database
		}))
	};
}

function readImportDocument(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new ApiError(400, "导入文件不是合法的 DSH 插件配置对象");
	}
	if (value["format"] !== EXPORT_FORMAT || value["formatVersion"] !== EXPORT_FORMAT_VERSION) {
		throw new ApiError(400, "导入文件格式或版本不受支持");
	}
	if (value["plugin"] !== PLUGIN_ID) {
		throw new ApiError(400, "该文件不是数据库连接插件的配置包");
	}
	const items = value["items"];
	if (!Array.isArray(items)) throw new ApiError(400, "导入文件缺少 items 配置列表");
	if (items.length === 0) throw new ApiError(400, "导入文件中没有可导入的数据库连接");
	if (items.length > MAX_IMPORT_ITEMS) throw new ApiError(400, `单次最多导入 ${MAX_IMPORT_ITEMS} 个数据库连接`);
	return items;
}

function readConflictPolicy(value) {
	return value === "replace" || value === "copy" ? value : "skip";
}

function uniqueConnectionName(base, connections) {
	const used = new Set(connections.map((connection) => connection.name.trim().toLowerCase()));
	let candidate = `${base}（导入副本）`;
	let index = 2;
	while (used.has(candidate.trim().toLowerCase())) {
		candidate = `${base}（导入副本 ${index}）`;
		index += 1;
	}
	return candidate;
}

/** 原子计算批量导入结果；任何条目格式错误都会终止整次导入。 */
function mergeImportedConnections(existingConnections, rawItems, policy) {
	const parsed = rawItems.map((item, index) => {
		try {
			return { ...readConnection(item), password: "" };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ApiError(400, `第 ${index + 1} 个数据库连接无效：${message}`);
		}
	});

	const next = [...existingConnections];
	const summary = { imported: 0, replaced: 0, copied: 0, skipped: 0 };
	const skipped = [];

	for (const input of parsed) {
		const inputName = input.name.trim().toLowerCase();
		const matches = next.filter((connection) =>
			(input.id && connection.id === input.id) || connection.name.trim().toLowerCase() === inputName
		);
		const targets = [...new Map(matches.map((connection) => [connection.id, connection])).values()];

		if (targets.length > 0 && policy === "skip") {
			summary.skipped += 1;
			skipped.push({ name: input.name, reason: "同 ID 或连接名称已存在" });
			continue;
		}
		if (targets.length > 1 && policy === "replace") {
			summary.skipped += 1;
			skipped.push({ name: input.name, reason: "ID 与连接名称分别命中不同连接，无法安全覆盖" });
			continue;
		}
		if (targets.length === 1 && policy === "replace") {
			const target = targets[0];
			next[next.indexOf(target)] = { ...input, id: target.id, password: target.password };
			summary.replaced += 1;
			continue;
		}
		if (targets.length > 0 && policy === "copy") {
			next.push({ ...input, id: randomUUID(), name: uniqueConnectionName(input.name, next), password: "" });
			summary.copied += 1;
			continue;
		}

		next.push({
			...input,
			id: input.id && !next.some((connection) => connection.id === input.id) ? input.id : randomUUID(),
			password: ""
		});
		summary.imported += 1;
	}

	return { connections: next, summary, skipped };
}
/**
* 注册 host 半部：settings 持久化 + HTTP API。依赖 settings 与 webServer，
* 两者都由 web profile 提供。
*/
function apply(ctx) {
	ctx.inject(["settings", "webServer", "tools"], (sctx) => {
		const scope = sctx.settings.register(NAMESPACE, ConfigSchema);
		const semantic = createSemanticRuntime(scope, sctx);
		sctx.effect(() => () => { semantic.dispose().catch(() => {}); }, "database: query result cleanup");
		const semanticService = Object.freeze({
			version: semantic.version,
			listDatasets(options = {}) {
				const snapshot = semantic.getSnapshot({ includeFields: options.includeFields === true });
				return snapshot.datasets;
			},
			getDatasetContext: semantic.getDatasetContext,
			getTopologyContext: semantic.getTopologyContext,
			findJoinPath: semantic.findJoinPath,
			queryDataset: semantic.queryDataset,
			getSnapshot: semantic.getSnapshot,
			searchDatasetCatalog: semantic.searchDatasetCatalog,
			searchDatasetFields: semantic.searchDatasetFields,
			prepareTaskContext: semantic.prepareTaskContext
		});
		sctx.provide("databaseSemanticLayer", semanticService);
		for (const tool of buildSemanticTools(semantic)) sctx.tools.register(tool);
		const route = {
			kind: "prefix",
			path: API_PREFIX,
			handler: async (req, res) => {
				const controller = new AbortController();
				const abort = () => controller.abort(new Error("数据库语义层请求已取消"));
				req.once("aborted", abort);
				try {
					await dispatch(scope, semantic, req, res, controller.signal);
				} catch (error) {
					if (error instanceof ApiError || error instanceof SemanticApiError || error?.semanticInputError === true) {
						sendJson(res, error.status, {
							ok: false,
							error: error.message
						});
						return;
					}
					const message = error instanceof Error ? error.message : String(error);
					sctx.logger?.warn?.("database-connections: %s", message);
					sendJson(res, 500, {
						ok: false,
						error: message
					});
				} finally {
					req.off("aborted", abort);
				}
			}
		};
		sctx.webServer.register(route);
	});
}
/** 按 path + method 分发请求。 */
async function dispatch(scope, semantic, req, res, signal) {
	const sub = new URL(req.url ?? "/", "http://x").pathname.slice(API_PREFIX.length).replace(/^\/+/, "");
	const method = req.method ?? "GET";
	if (method === "GET" && (sub === "" || sub === "list")) {
		sendJson(res, 200, {
			ok: true,
			connections: scope.get().connections.map(toView)
		});
		return;
	}
	if (method === "GET" && sub.startsWith("semantic/")) {
		sendJson(res, 200, { ok: true, ...await dispatchSemantic(semantic, method, sub.slice("semantic/".length), {}, signal) });
		return;
	}
	const body = await readJsonBody(req);
	if (sub.startsWith("semantic/")) {
		sendJson(res, 200, { ok: true, ...await dispatchSemantic(semantic, method, sub.slice("semantic/".length), body, signal) });
		return;
	}
	if (method === "POST" && sub === "save") {
		const input = readConnection(body["connection"] ?? body);
		const connections = [...scope.get().connections];
		const existing = connections.find((c) => c.id === input.id && input.id !== "");
		if (existing !== void 0) {
			const next = {
				...input,
				id: existing.id,
				username: input.username.length > 0 ? input.username : existing.username,
				password: input.password.length > 0 ? input.password : existing.password
			};
			connections[connections.indexOf(existing)] = next;
		} else {
			const next = {
				...input,
				id: randomUUID()
			};
			connections.push(next);
		}
		await scope.replace({ ...scope.get(), connections });
		sendJson(res, 200, {
			ok: true,
			connections: connections.map(toView)
		});
		return;
	}
	if (method === "POST" && sub === "delete") {
		const id = body["id"];
		if (typeof id !== "string" || id.length === 0) throw new ApiError(400, "缺少连接 id");
		await semantic.deleteConnectionGuard(id);
		const connections = scope.get().connections.filter((c) => c.id !== id);
		await scope.replace({ ...scope.get(), connections });
		sendJson(res, 200, {
			ok: true,
			connections: connections.map(toView)
		});
		return;
	}
	if (method === "POST" && sub === "export") {
		const ids = Array.isArray(body["ids"])
			? body["ids"].filter((id) => typeof id === "string" && id.length > 0)
			: [];
		if (ids.length === 0) throw new ApiError(400, "请至少选择一个数据库连接再导出");
		const idSet = new Set(ids);
		const selected = scope.get().connections.filter((connection) => idSet.has(connection.id));
		if (selected.length === 0) throw new ApiError(400, "没有找到可导出的数据库连接");
		sendJson(res, 200, { ok: true, document: createExportDocument(selected) });
		return;
	}
	if (method === "POST" && sub === "import") {
		const rawDocument = body["document"] ?? body;
		const rawItems = readImportDocument(rawDocument);
		const result = mergeImportedConnections(scope.get().connections, rawItems, readConflictPolicy(body["conflictPolicy"]));
		await scope.replace({ ...scope.get(), connections: result.connections });
		sendJson(res, 200, {
			ok: true,
			connections: result.connections.map(toView),
			summary: result.summary,
			skipped: result.skipped,
			passwordsOmitted: rawItems.length
		});
		return;
	}
	if (method === "POST" && sub === "test") {
		sendJson(res, 200, {
			ok: true,
			...await testConnection(readOperationalConnection(scope, body["connection"] ?? body))
		});
		return;
	}
	if (method === "POST" && sub === "databases") {
		sendJson(res, 200, {
			ok: true,
			...await listDatabases(readOperationalConnection(scope, body["connection"] ?? body))
		});
		return;
	}
	if (method === "POST" && sub === "tables") {
		sendJson(res, 200, {
			ok: true,
			...await listTables(readOperationalConnection(scope, body["connection"] ?? body), typeof body["database"] === "string" ? body["database"] : "")
		});
		return;
	}
	if (method === "POST" && sub === "query") {
		const connection = readOperationalConnection(scope, body["connection"] ?? body);
		const sql = body["sql"];
		if (typeof sql !== "string") throw new ApiError(400, "缺少 sql");
		sendJson(res, 200, {
			ok: true,
			...await runQuery(connection, sql)
		});
		return;
	}
	throw new ApiError(404, `未知接口：${method} ${sub}`);
}

/** 数据集、语义概念、关系拓扑、识别和语义查询接口。 */
async function dispatchSemantic(semantic, method, sub, body, signal) {
	if (method === "GET" && sub === "state") return { state: semantic.getState() };
	if (method === "GET" && sub === "rules") return { rules: semantic.getRuleDefinition() };
	if (method === "GET" && sub === "models") return { models: await semantic.listModels() };
	if (method === "GET" && sub === "audit") return { auditLog: semantic.getAudit() };
	if (method === "GET" && sub === "snapshot") return { snapshot: semantic.getSnapshot() };
	if (method !== "POST") throw new SemanticApiError(404, `未知语义层接口：${method} ${sub}`);
	if (sub === "context/catalog") return semantic.searchDatasetCatalog(body);
	if (sub === "context/fields") return semantic.searchDatasetFields(body);
	if (sub === "context/task") return { result: await semantic.prepareTaskContext(body) };
	if (sub === "relations/plan-llm") return { plan: semantic.planRelationBatches(String(body["topologyId"] ?? ""), body) };
	if (sub === "datasets/inspect") return { metadata: await semantic.inspectDataset(body, signal) };
	if (sub === "datasets/save") return await semantic.saveDataset(body["dataset"] ?? body, signal);
	if (sub === "datasets/sync") return await semantic.syncDataset(String(body["id"] ?? ""), signal);
	if (sub === "datasets/delete") return await semantic.deleteDataset(String(body["id"] ?? ""), body["cascade"] === true);
	if (sub === "concepts/save") return await semantic.saveConcept(body["concept"] ?? body);
	if (sub === "concepts/delete") return await semantic.deleteConcept(String(body["id"] ?? ""));
	if (sub === "topologies/save") return await semantic.saveTopology(body["topology"] ?? body);
	if (sub === "topologies/delete") return await semantic.deleteTopology(String(body["id"] ?? ""));
	if (sub === "relations/save") return await semantic.saveRelation(body["relation"] ?? body);
	if (sub === "relations/confirm") return await semantic.confirmRelation(String(body["id"] ?? ""));
	if (sub === "relations/reject") return await semantic.rejectRelation(String(body["id"] ?? ""));
	if (sub === "relations/delete") return await semantic.deleteRelation(String(body["id"] ?? ""));
	if (sub === "relations/identify-rules") return await semantic.identifyByRules(String(body["topologyId"] ?? ""), body["sampleValues"] === true, signal);
	if (sub === "relations/identify-llm") return await semantic.identifyByLlm(String(body["topologyId"] ?? ""), body, signal);
	if (sub === "model/save") return await semantic.saveModelConfig(body["modelConfig"] ?? body);
	if (sub === "context/dataset") {
		const context = semantic.getDatasetContext(String(body["id"] ?? body["datasetId"] ?? ""));
		if (!context) throw new SemanticApiError(404, "数据集不存在或未启用");
		return { context };
	}
	if (sub === "context/topology") {
		const context = semantic.getTopologyContext(String(body["id"] ?? body["topologyId"] ?? ""));
		if (!context) throw new SemanticApiError(404, "关系拓扑不存在或未启用");
		return { context };
	}
	if (sub === "context/join-path") return { path: semantic.findJoinPath(String(body["fromDatasetId"] ?? ""), String(body["toDatasetId"] ?? ""), typeof body["topologyId"] === "string" ? body["topologyId"] : void 0) ?? [] };
	if (sub === "query/dataset") return await semantic.queryDataset(String(body["datasetId"] ?? ""), body["request"] ?? body, signal);
	throw new SemanticApiError(404, `未知语义层接口：${method} ${sub}`);
}
//#endregion
export { apply };
