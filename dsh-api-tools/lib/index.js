/**
 * API 调用插件 —— host 半部。
 *
 * 提供：
 * 1. API 工具配置的持久化（settings namespace `api-tools`）。
 * 2. /api/api-tools 前缀 HTTP API，供 client 端设置页调用：
 *    list / save / delete / test / credential / export / import。
 * 3. 动态工具注册：把每个「已启用」的 API 配置注册成一个有明确参数的
 *    Agent 工具；Agent 在合适的时候调用该工具，即可发起第三方 API 请求，
 *    实现数据查询或控制指令下发。
 *
 * 安全约束：
 * - 密钥只保存引用（环境变量名样式），实际值经 credentials 服务按次解析，
 *   不会进入普通配置、Agent 上下文或调用轨迹；
 * - 接口地址仅允许 http/https；
 * - 响应体大小有上限，超时可控。
 * @module @deepseek-ai/dsh-api-tools
 */

import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";

import { defineTool } from "@deepseek-ai/dsh-tools";
import { credentialRef } from "@deepseek-ai/dsh-credentials";

const NAMESPACE = "api-tools";
const API_PREFIX = "/api/api-tools";
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 默认 10 MB
const MAX_RESPONSE_BYTES_LIMIT = 50 * 1024 * 1024; // 上限 50 MB
const DEFAULT_TIMEOUT_MS = 60e3; // 60 秒
const MAX_CONFIG_DOCUMENT_BYTES = 5 * 1024 * 1024; // 批量配置文件最大 5 MB
const MAX_IMPORT_ITEMS = 500;
const EXPORT_FORMAT = "dsh-plugin-config";
const EXPORT_FORMAT_VERSION = 1;
const PLUGIN_ID = "@deepseek-ai/dsh-api-tools";
const PLUGIN_VERSION = "1.0.2";

/** 参数位置白名单。 */
const PARAM_LOCATIONS = ["path", "query", "header", "body"];
/** 参数类型白名单。 */
const PARAM_TYPES = ["string", "number", "boolean", "object", "array"];
/** 参数值来源白名单。 */
const PARAM_SOURCES = ["agent", "fixed", "credential", "default"];
/** 认证方式白名单。 */
const AUTH_TYPES = ["none", "api-key", "bearer", "basic"];
/** HTTP 方法白名单。 */
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** 单条参数定义。 */
const ParamSchema = z.object({
  name: z.string().min(1),
  location: z.union(PARAM_LOCATIONS.map((v) => z.const(v))),
  type: z.union(PARAM_TYPES.map((v) => z.const(v))),
  source: z.union(PARAM_SOURCES.map((v) => z.const(v))),
  required: z.boolean(),
  description: z.string(),
  // 默认值：Agent 未提供该字段时使用；fixed=固定值；credential=凭据引用名；default=默认值。
  defaultValue: z.string(),
  // 子参数：array 的元素对象字段 / object 的字段，递归。
  children: z.array(z.lazy(() => ParamSchema)).default([])
});

/** 单条 API 工具定义。 */
const ApiToolSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  toolId: z.string().min(1),
  purpose: z.string().min(1),
  method: z.union(METHODS.map((v) => z.const(v))),
  url: z.string().min(1),
  auth: z.union(AUTH_TYPES.map((v) => z.const(v))),
  credential: z.string(),
  enabled: z.boolean(),
  maxResponseBytes: z.number().default(DEFAULT_MAX_RESPONSE_BYTES),
  params: z.array(ParamSchema)
});

/** 配置节 schema。 */
const ConfigSchema = z.object({ tools: z.array(ApiToolSchema) });

/** 统一错误结构。 */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** 规范化请求体中的一条参数（client 提交形态）。 */
function readParam(input) {
  const record = input ?? {};
  const location = PARAM_LOCATIONS.includes(record["location"]) ? record["location"] : "query";
  const type = PARAM_TYPES.includes(record["type"]) ? record["type"] : "string";
  const source = PARAM_SOURCES.includes(record["source"]) ? record["source"] : "agent";
  const children = Array.isArray(record["children"]) ? record["children"].map(readParam) : [];
  return {
    name: typeof record["name"] === "string" ? record["name"].trim() : "",
    location,
    type,
    source,
    required: record["required"] === true,
    description: typeof record["description"] === "string" ? record["description"] : "",
    defaultValue: typeof record["defaultValue"] === "string" ? record["defaultValue"] : "",
    children: children.filter((c) => c.name.length > 0)
  };
}

/** 规范化响应上限（字节），越界取默认值或上限。 */
function clampMaxResponse(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return DEFAULT_MAX_RESPONSE_BYTES;
  return Math.min(value, MAX_RESPONSE_BYTES_LIMIT);
}

/** 规范化请求体中的一条 API 工具定义。 */
function readTool(input) {
  if (typeof input !== "object" || input === null) throw new ApiError(400, "缺少 API 工具配置");
  const record = input;
  const name = typeof record["name"] === "string" ? record["name"].trim() : "";
  if (name.length === 0) throw new ApiError(400, "工具名称不能为空");
  const purpose = typeof record["purpose"] === "string" ? record["purpose"].trim() : "";
  if (purpose.length === 0) throw new ApiError(400, "「何时调用」不能为空");
  const url = typeof record["url"] === "string" ? record["url"].trim() : "";
  if (url.length === 0) throw new ApiError(400, "接口地址不能为空");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ApiError(400, "接口地址仅支持 HTTP 或 HTTPS");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "接口地址不是合法 URL");
  }
  const method = METHODS.includes(record["method"]) ? record["method"] : "GET";
  const auth = AUTH_TYPES.includes(record["auth"]) ? record["auth"] : "none";
  const params = Array.isArray(record["params"]) ? record["params"].map(readParam) : [];
  const rawParams = params.filter((p) => p.name.length > 0);
  if (rawParams.length !== params.length) throw new ApiError(400, "参数名称不能为空");
  return {
    id: typeof record["id"] === "string" ? record["id"] : "",
    name,
    toolId: (typeof record["toolId"] === "string" ? record["toolId"].trim() : "") || slugifyName(name),
    purpose,
    method,
    url,
    auth,
    credential: typeof record["credential"] === "string" ? record["credential"].trim() : "",
    enabled: record["enabled"] === true,
    maxResponseBytes: clampMaxResponse(record["maxResponseBytes"]),
    params: rawParams
  };
}

/** 把工具 id 转成 snake_case。 */
function slugifyName(name) {
  const ascii = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return ascii || `api_tool_${Date.now().toString(36)}`;
}

/** 校验 toolId（Agent 工具名）合法且非保留名。 */
function assertToolId(toolId) {
  if (!/^[a-z][a-z0-9_]*$/.test(toolId)) {
    throw new ApiError(400, "系统工具标识须为小写字母开头的 snake_case（如 query_weather）");
  }
  if (toolId === "run_code") throw new ApiError(400, "run_code 是保留工具名，请更换");
}

/** 把一组子参数编译成 object 的 properties map。 */
function toPropertiesMap(children) {
  const props = {};
  for (const c of children ?? []) {
    if (!c.name) continue;
    props[c.name] = toParamSchema(c);
  }
  return props;
}

/** 把数组参数的元素编译成 items schema（元素为对象时返回对象 schema）。 */
function toArrayItems(children) {
  if (!children || children.length === 0) return undefined;
  return { type: "object", properties: toPropertiesMap(children), additionalProperties: true };
}

/** 把配置里的参数类型映射为 defineTool 的参数 schema 节点（递归，支持子参数）。 */
function toParamSchema(p) {
  const base = { description: p.description || p.name };
  const required = p.required ? { required: true } : {};
  switch (p.type) {
    case "number":
      // JSON/JavaScript 无法精确表示超过 2^53-1 的整数。若默认值已经表明这是
      // 64 位标识，则让 Agent 以字符串传入，发请求时再按原始 JSON 数字输出。
      if (isUnsafeIntegerLiteral(p.defaultValue)) {
        return {
          ...base,
          description: `${base.description}（超长整数，请按字符串原样传入）`,
          type: "string",
          ...required
        };
      }
      return { ...base, type: "number", ...required };
    case "boolean":
      return { ...base, type: "boolean", ...required };
    case "object":
      return { ...base, type: "object", properties: toPropertiesMap(p.children), additionalProperties: true, ...required };
    case "array": {
      const items = toArrayItems(p.children);
      return { ...base, type: "array", ...(items ? { items } : {}), ...required };
    }
    default:
      return { ...base, type: "string", ...required };
  }
}

/** 递归描述一条参数（含子字段提示）。 */
function describeParam(p, indent) {
  const agentChildren = (p.children ?? []).filter((c) => c.source === "agent");
  const childHint = agentChildren.length > 0 ? `，子字段 ${agentChildren.map((c) => c.name).join("、")}` : "";
  const lines = [`${indent}${p.name}（${p.description || p.type}${childHint}）`];
  for (const c of agentChildren) lines.push(...describeParam(c, `${indent}  `));
  return lines;
}

/** 组装工具的模型可见描述。 */
function buildDescription(api) {
  const lines = [api.purpose];
  lines.push(`接口：${api.method} ${api.url}`);
  const agentParams = api.params.filter((p) => p.source === "agent");
  if (agentParams.length > 0) {
    lines.push("参数：");
    for (const p of agentParams) lines.push(...describeParam(p, "  - "));
  }
  if (api.auth !== "none" && api.credential) {
    lines.push(`认证：${api.auth}（凭据引用 ${api.credential}）`);
  }
  return lines.join("\n");
}

/** 把「非 agent 来源」的字符串值按类型转换。 */
function isIntegerLiteral(raw) {
  return typeof raw === "string" && /^-?(?:0|[1-9][0-9]*)$/.test(raw.trim());
}

/** 判断十进制整数字符串是否超出 JavaScript 安全整数范围。 */
function isUnsafeIntegerLiteral(raw) {
  if (!isIntegerLiteral(raw)) return false;
  try {
    const value = BigInt(raw.trim());
    return value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER);
  } catch {
    return false;
  }
}

/** 把普通数字或精确的超长整数字符串转换为请求阶段使用的值。 */
function coerceNumberValue(raw, name) {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number") {
    if (Number.isInteger(raw) && !Number.isSafeInteger(raw)) {
      throw new ApiError(400, `参数 ${name || "数字"} 已超出 JavaScript 安全整数范围且精度已经丢失，请用引号包裹该值后重试`);
    }
    return Number.isFinite(raw) ? raw : String(raw);
  }
  if (isIntegerLiteral(raw)) {
    const text = raw.trim();
    if (isUnsafeIntegerLiteral(text)) return BigInt(text);
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : String(raw);
}

function coerceValue(raw, type, name = "") {
  if (raw === undefined || raw === null) return raw;
  switch (type) {
    case "number":
      return coerceNumberValue(raw, name);
    case "boolean":
      return raw === true || raw === "true" || raw === "1";
    case "object":
    case "array":
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return raw;
    default:
      return String(raw);
  }
}

/** 按参数子字段递归转换结构化值，避免嵌套的超长整数再次被普通 Number 舍入。 */
function coerceParamValue(p, raw) {
  if (raw === undefined || raw === null) return raw;
  if (p.type === "object" && typeof raw === "object" && !Array.isArray(raw)) {
    const result = { ...raw };
    for (const child of p.children ?? []) {
      if (Object.prototype.hasOwnProperty.call(result, child.name)) {
        result[child.name] = coerceParamValue(child, result[child.name]);
      }
    }
    return result;
  }
  if (p.type === "array" && Array.isArray(raw)) {
    if (!p.children || p.children.length === 0) return raw;
    return raw.map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
      const result = { ...item };
      for (const child of p.children) {
        if (Object.prototype.hasOwnProperty.call(result, child.name)) {
          result[child.name] = coerceParamValue(child, result[child.name]);
        }
      }
      return result;
    });
  }
  return coerceValue(raw, p.type, p.name);
}

/** 校验并品牌化凭据引用名；格式错误抛友好 ApiError。 */
function assertCredentialRef(name) {
  try {
    return credentialRef(name);
  } catch {
    throw new ApiError(400, `凭据引用「${name}」格式不正确：须为环境变量名样式（字母/数字/下划线，且以字母或下划线开头），例如 CMS_API_TOKEN。请勿把密钥值直接填进「凭据引用」，密钥请填在「密钥值」框或同名环境变量中。`);
  }
}

/** 解析某参数在当前调用中的值（含凭据解析与默认值兜底）。 */
async function resolveParamValue(p, args, sctx) {
  switch (p.source) {
    case "agent": {
      const v = args === undefined || args === null ? undefined : args[p.name];
      if (v !== undefined && v !== null && v !== "") return coerceParamValue(p, v);
      // Agent 未提供该字段时，回退到默认值。
      return p.defaultValue === "" ? undefined : coerceParamValue(p, p.defaultValue);
    }
    case "fixed":
      return coerceParamValue(p, p.defaultValue);
    case "credential": {
      if (!p.defaultValue) return undefined;
      const resolved = await sctx.credentials.resolve(assertCredentialRef(p.defaultValue));
      return resolved === undefined ? undefined : coerceParamValue(p, resolved.value);
    }
    case "default":
      return p.defaultValue === "" ? undefined : coerceParamValue(p, p.defaultValue);
    default:
      return undefined;
  }
}

/**
 * JSON.stringify 不能序列化 BigInt。本函数仅对 BigInt 输出未加引号的十进制字面量，
 * 其余 JSON 值遵循标准序列化规则，从而保留后端 Long/Int64 标识的每一位。
 */
function stringifyJsonBody(value) {
  const stack = new Set();
  const serialize = (current, inArray = false) => {
    if (typeof current === "bigint") return current.toString();
    if (current === null) return "null";
    if (typeof current === "string" || typeof current === "boolean") return JSON.stringify(current);
    if (typeof current === "number") return Number.isFinite(current) ? JSON.stringify(current) : "null";
    if (current === undefined || typeof current === "function" || typeof current === "symbol") {
      return inArray ? "null" : undefined;
    }
    if (typeof current !== "object") return JSON.stringify(current);
    if (stack.has(current)) throw new ApiError(400, "请求体包含循环引用，无法序列化为 JSON");
    stack.add(current);
    try {
      if (Array.isArray(current)) {
        return `[${current.map((item) => serialize(item, true) ?? "null").join(",")}]`;
      }
      const pairs = [];
      for (const [key, item] of Object.entries(current)) {
        const encoded = serialize(item, false);
        if (encoded !== undefined) pairs.push(`${JSON.stringify(key)}:${encoded}`);
      }
      return `{${pairs.join(",")}}`;
    } finally {
      stack.delete(current);
    }
  };
  return serialize(value);
}

/** 为一次调用解析认证头。 */
async function applyAuth(api, headers, sctx) {
  if (api.auth === "none") return;
  if (!api.credential) throw new ApiError(400, `认证方式为 ${api.auth}，但未填写凭据引用`);
  const resolved = await sctx.credentials.resolve(assertCredentialRef(api.credential));
  if (resolved === undefined) {
    throw new ApiError(400, `凭据 ${api.credential} 未配置（请在「密钥值」框填写，或设置同名环境变量）`);
  }
  switch (api.auth) {
    case "bearer":
      headers["Authorization"] = `Bearer ${resolved.value}`;
      break;
    case "api-key":
      headers["X-API-Key"] = resolved.value;
      break;
    case "basic":
      headers["Authorization"] = `Basic ${Buffer.from(resolved.value, "utf8").toString("base64")}`;
      break;
    default:
      break;
  }
}

/** 带超时与外部取消信号的 fetch。 */
async function fetchWithTimeout(url, init, signal, timeoutMs, consume) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // Keep timeout and caller cancellation active until the response body is consumed.
    return await consume(response);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/** 真实调用第三方 API，返回统一结构。 */
async function callApi(api, args, sctx, signal, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();
  const headers = {};
  const pathValues = {};
  const queryValues = {};
  const bodyValues = {};

  for (const p of api.params) {
    const value = await resolveParamValue(p, args, sctx);
    if (value === undefined || value === null || value === "") continue;
    switch (p.location) {
      case "path":
        pathValues[p.name] = value;
        break;
      case "query":
        queryValues[p.name] = value;
        break;
      case "header":
        headers[p.name] = String(value);
        break;
      case "body":
        bodyValues[p.name] = value;
        break;
      default:
        break;
    }
  }

  // 替换 path 占位符 {name}
  let rawUrl = api.url;
  for (const [key, value] of Object.entries(pathValues)) {
    rawUrl = rawUrl.split(`{${key}}`).join(encodeURIComponent(String(value)));
  }
  const url = new URL(rawUrl);
  for (const [key, value] of Object.entries(queryValues)) {
    url.searchParams.set(key, String(value));
  }

  await applyAuth(api, headers, sctx);

  const hasBody = Object.keys(bodyValues).length > 0;
  let body;
  if (hasBody) {
    body = stringifyJsonBody(bodyValues);
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const { response, text } = await fetchWithTimeout(
    url.toString(),
    { method: api.method, headers, body },
    signal,
    timeoutMs,
    async (response) => ({ response, text: await readBounded(response, clampMaxResponse(api.maxResponseBytes)) })
  );
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    ...(response.ok ? { data } : { error: data }),
    ms: Date.now() - startedAt
  };
}

/** 读取响应体并限制大小。 */
async function readBounded(response, maxBytes = DEFAULT_MAX_RESPONSE_BYTES) {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    await response.body?.cancel();
    throw new ApiError(502, `响应过大（${contentLength} 字节），超过 ${maxBytes} 字节上限`);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ApiError(502, `响应过大（${bytes} 字节），超过 ${maxBytes} 字节上限`);
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, bytes).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

/** 把一个 API 配置编译成 defineTool 定义。 */
function buildTool(api, sctx) {
  const parameters = {};
  for (const p of api.params) {
    if (p.source !== "agent") continue;
    parameters[p.name] = toParamSchema(p);
  }
  return defineTool({
    name: api.toolId,
    description: buildDescription(api),
    parameters,
    output: {
      schema: { type: "json" },
      render(_args, value) {
        return [{ type: "text", text: JSON.stringify(value, null, 2) }]
      }
    },
    timeoutMs: DEFAULT_TIMEOUT_MS,
    async execute(args, exec) {
      return callApi(api, args, sctx, exec.signal, DEFAULT_TIMEOUT_MS)
    }
  });
}

/** 读取请求体 JSON。 */
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

/** 写入 JSON 响应。 */
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

/** 把持久化的 API 配置转成给 client 的视图（密钥只留引用名）。 */
function toView(tool) {
  return {
    id: tool.id,
    name: tool.name,
    toolId: tool.toolId,
    purpose: tool.purpose,
    method: tool.method,
    url: tool.url,
    auth: tool.auth,
    credential: tool.credential,
    enabled: tool.enabled,
    maxResponseBytes: clampMaxResponse(tool.maxResponseBytes),
    params: tool.params.map((p) => ({ ...p }))
  };
}

/** 生成不含真实密钥的可迁移 API 配置文件。 */
function createExportDocument(tools) {
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    plugin: PLUGIN_ID,
    pluginVersion: PLUGIN_VERSION,
    exportedAt: new Date().toISOString(),
    secretPolicy: "references-only",
    items: tools.map(toView)
  };
}

/** 校验导入文件的外壳，具体条目继续复用 readTool 的严格校验。 */
function readImportDocument(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(400, "导入文件不是合法的 DSH 插件配置对象");
  }
  if (value["format"] !== EXPORT_FORMAT || value["formatVersion"] !== EXPORT_FORMAT_VERSION) {
    throw new ApiError(400, "导入文件格式或版本不受支持");
  }
  if (value["plugin"] !== PLUGIN_ID) {
    throw new ApiError(400, "该文件不是 API 调用插件的配置包");
  }
  const items = value["items"];
  if (!Array.isArray(items)) throw new ApiError(400, "导入文件缺少 items 配置列表");
  if (items.length === 0) throw new ApiError(400, "导入文件中没有可导入的 API 工具");
  if (items.length > MAX_IMPORT_ITEMS) throw new ApiError(400, `单次最多导入 ${MAX_IMPORT_ITEMS} 个 API 工具`);
  return items;
}

function readConflictPolicy(value) {
  return value === "replace" || value === "copy" ? value : "skip";
}

function uniqueToolId(base, tools) {
  const used = new Set(tools.map((tool) => tool.toolId));
  let candidate = `${base}_copy`;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}_copy_${index}`;
    index += 1;
  }
  return candidate;
}

function collectCredentialRefsFromParam(param, refs) {
  if (param.source === "credential" && param.defaultValue) refs.add(param.defaultValue);
  for (const child of param.children ?? []) collectCredentialRefsFromParam(child, refs);
}

/**
 * 原子计算导入结果：全部条目先完成格式校验，再一次性替换 settings。
 * skip=跳过冲突，replace=覆盖唯一冲突项，copy=冲突项另存副本。
 */
function mergeImportedTools(existingTools, rawItems, policy) {
  const parsed = rawItems.map((item, index) => {
    try {
      const tool = readTool(item);
      assertToolId(tool.toolId);
      return tool;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ApiError(400, `第 ${index + 1} 个 API 工具无效：${message}`);
    }
  });

  const next = [...existingTools];
  const summary = { imported: 0, replaced: 0, copied: 0, skipped: 0 };
  const skipped = [];
  const credentialRefs = new Set();

  for (const input of parsed) {
    if (input.auth !== "none" && input.credential) credentialRefs.add(input.credential);
    for (const param of input.params) collectCredentialRefsFromParam(param, credentialRefs);

    const matches = next.filter((tool) => (input.id && tool.id === input.id) || tool.toolId === input.toolId);
    const targets = [...new Map(matches.map((tool) => [tool.id, tool])).values()];

    if (targets.length > 0 && policy === "skip") {
      summary.skipped += 1;
      skipped.push({ name: input.name, reason: "同 ID 或系统工具标识已存在" });
      continue;
    }

    if (targets.length > 1 && policy === "replace") {
      summary.skipped += 1;
      skipped.push({ name: input.name, reason: "ID 与系统工具标识分别命中不同工具，无法安全覆盖" });
      continue;
    }

    if (targets.length === 1 && policy === "replace") {
      const target = targets[0];
      next[next.indexOf(target)] = { ...input, id: target.id };
      summary.replaced += 1;
      continue;
    }

    if (targets.length > 0 && policy === "copy") {
      next.push({
        ...input,
        id: randomUUID(),
        name: `${input.name}（导入副本）`,
        toolId: uniqueToolId(input.toolId, next)
      });
      summary.copied += 1;
      continue;
    }

    next.push({
      ...input,
      id: input.id && !next.some((tool) => tool.id === input.id) ? input.id : randomUUID()
    });
    summary.imported += 1;
  }

  return {
    tools: next,
    summary,
    skipped,
    requiredCredentials: [...credentialRefs].sort()
  };
}

/** 按 path + method 分发请求。 */
async function dispatch(scope, sctx, req, res) {
  const pathname = new URL(req.url ?? "/", "http://x").pathname;
  const sub = pathname.startsWith(API_PREFIX) ? pathname.slice(API_PREFIX.length).replace(/^\/+/, "") : "";
  const method = req.method ?? "GET";

  if (method === "GET" && (sub === "" || sub === "list")) {
    sendJson(res, 200, {
      ok: true,
      tools: scope.get().tools.map(toView)
    });
    return;
  }

  const body = await readJsonBody(req);

  if (method === "POST" && sub === "save") {
    const input = readTool(body["tool"] ?? body);
    assertToolId(input.toolId);
    const tools = [...scope.get().tools];
    // toolId 唯一性（跨所有工具，含 Agent 工具名冲突）。
    const duplicate = tools.find((t) => t.toolId === input.toolId && t.id !== input.id);
    if (duplicate !== undefined) throw new ApiError(400, `工具标识 ${input.toolId} 已被「${duplicate.name}」占用`);
    const existing = tools.find((t) => t.id === input.id && input.id !== "");
    let nextTools;
    if (existing !== undefined) {
      nextTools = tools.map((t) => (t.id === existing.id ? { ...input, id: existing.id } : t));
    } else {
      nextTools = [...tools, { ...input, id: randomUUID() }];
    }
    await scope.replace({ tools: nextTools });
    sendJson(res, 200, { ok: true, tools: nextTools.map(toView) });
    return;
  }

  if (method === "POST" && sub === "delete") {
    const id = body["id"];
    if (typeof id !== "string" || id.length === 0) throw new ApiError(400, "缺少工具 id");
    const nextTools = scope.get().tools.filter((t) => t.id !== id);
    await scope.replace({ tools: nextTools });
    sendJson(res, 200, { ok: true, tools: nextTools.map(toView) });
    return;
  }

  if (method === "POST" && sub === "export") {
    const ids = Array.isArray(body["ids"])
      ? body["ids"].filter((id) => typeof id === "string" && id.length > 0)
      : [];
    if (ids.length === 0) throw new ApiError(400, "请至少选择一个 API 工具再导出");
    const idSet = new Set(ids);
    const selected = scope.get().tools.filter((tool) => idSet.has(tool.id));
    if (selected.length === 0) throw new ApiError(400, "没有找到可导出的 API 工具");
    sendJson(res, 200, { ok: true, document: createExportDocument(selected) });
    return;
  }

  if (method === "POST" && sub === "import") {
    const rawDocument = body["document"] ?? body;
    const rawItems = readImportDocument(rawDocument);
    const result = mergeImportedTools(scope.get().tools, rawItems, readConflictPolicy(body["conflictPolicy"]));
    await scope.replace({ tools: result.tools });
    sendJson(res, 200, {
      ok: true,
      tools: result.tools.map(toView),
      summary: result.summary,
      skipped: result.skipped,
      requiredCredentials: result.requiredCredentials
    });
    return;
  }

  if (method === "POST" && sub === "test") {
    const input = readTool(body["tool"] ?? body);
    assertToolId(input.toolId);
    const args = body["args"] ?? {};
    const timeoutMs = typeof body["timeoutMs"] === "number" ? body["timeoutMs"] : DEFAULT_TIMEOUT_MS;
    // 用 result 包裹，避免 callApi 的 HTTP 层 ok 与 API 层 ok 冲突。
    sendJson(res, 200, { ok: true, result: await callApi(input, args, sctx, undefined, timeoutMs) });
    return;
  }

  if (method === "POST" && sub === "credential") {
    const name = body["name"];
    if (typeof name !== "string" || name.length === 0) throw new ApiError(400, "缺少凭据引用名");
    let resolved;
    try {
      resolved = await sctx.credentials.resolve(assertCredentialRef(name));
    } catch {
      resolved = undefined;
    }
    sendJson(res, 200, { ok: true, name, configured: resolved !== undefined, source: resolved === undefined ? undefined : resolved.source });
    return;
  }

  if (method === "POST" && sub === "credential/set") {
    const name = body["name"];
    const value = body["value"];
    if (typeof name !== "string" || name.length === 0) throw new ApiError(400, "缺少凭据引用名");
    if (typeof value !== "string" || value.length === 0) throw new ApiError(400, "密钥值不能为空");
    try {
      await sctx.credentials.set(assertCredentialRef(name), value);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : String(error));
    }
    sendJson(res, 200, { ok: true, name });
    return;
  }

  throw new ApiError(404, `未知接口：${method} ${sub}`);
}

/** 注册 host 半部。 */
function apply(ctx) {
  ctx.inject(["settings", "webServer", "tools", "credentials"], (sctx) => {
    const scope = sctx.settings.register(NAMESPACE, ConfigSchema);

    // 已注册工具的 disposer 表：toolId -> dispose。
    const disposers = new Map();

    /** 重新同步 Agent 工具：先卸载全部，再按「已启用」配置重建。 */
    function resyncTools() {
      for (const dispose of disposers.values()) {
        try {
          dispose();
        } catch (error) {
          sctx.logger?.warn?.("api-tools: 卸载工具失败：%s", error instanceof Error ? error.message : String(error));
        }
      }
      disposers.clear();
      const tools = scope.get().tools ?? [];
      for (const api of tools) {
        if (!api.enabled) continue;
        if (disposers.has(api.toolId)) continue;
        try {
          disposers.set(api.toolId, sctx.tools.register(buildTool(api, sctx)));
        } catch (error) {
          sctx.logger?.warn?.("api-tools: 注册工具 %s 失败：%s", api.toolId, error instanceof Error ? error.message : String(error));
        }
      }
    }

    // 初始注册 + 配置变更后重新同步。
    resyncTools();
    scope.watch(() => resyncTools());

    // HTTP API 路由。
    sctx.webServer.register({
      kind: "prefix",
      path: API_PREFIX,
      handler: async (req, res) => {
        try {
          await dispatch(scope, sctx, req, res);
        } catch (error) {
          if (error instanceof ApiError) {
            sendJson(res, error.status, { ok: false, error: error.message });
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          sctx.logger?.warn?.("api-tools: %s", message);
          sendJson(res, 500, { ok: false, error: message });
        }
      }
    });
  });
}

export { apply };

