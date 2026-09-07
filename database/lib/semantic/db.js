import { createHash } from "node:crypto";
import * as mysql from "mysql2/promise";
import { createClient } from "@clickhouse/client";
import { assertIdentifier, compileDatasetQuery, quoteIdentifier } from "./query.js";

const TIMEOUT_MS = 15000;
export const SAMPLE_DISTINCT_LIMIT = 1000;

async function withMySql(connection, run, signal) {
  signal?.throwIfAborted?.();
  const client = await mysql.createConnection({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    ...(connection.database ? { database: connection.database } : {}),
    connectTimeout: TIMEOUT_MS,
  });
  try {
    signal?.throwIfAborted?.();
    return await run(client);
  } finally {
    await client.end();
  }
}

async function withClickHouse(connection, run, signal) {
  signal?.throwIfAborted?.();
  const client = createClient({
    url: /^https?:\/\//.test(connection.host) ? connection.host : `http://${connection.host}:${connection.port}`,
    username: connection.username,
    password: connection.password,
    database: connection.database || "default",
    request_timeout: TIMEOUT_MS,
  });
  try {
    signal?.throwIfAborted?.();
    return await run(client);
  } finally {
    await client.close();
  }
}

function metadataVersion(tableComment, fields) {
  return createHash("sha256")
    .update(JSON.stringify({ tableComment, fields }))
    .digest("hex")
    .slice(0, 24);
}

function mapIndexes(rows) {
  const byColumn = new Map();
  for (const row of rows) {
    const column = String(row.COLUMN_NAME ?? row.column_name ?? "");
    if (!column) continue;
    const state = byColumn.get(column) ?? { indexed: false, unique: false, primaryKey: false };
    state.indexed = true;
    state.unique ||= Number(row.NON_UNIQUE ?? row.non_unique ?? 1) === 0;
    state.primaryKey ||= String(row.INDEX_NAME ?? row.index_name ?? "").toUpperCase() === "PRIMARY";
    byColumn.set(column, state);
  }
  return byColumn;
}

function mapReferences(rows) {
  const byColumn = new Map();
  for (const row of rows) {
    const column = String(row.COLUMN_NAME ?? "");
    if (!column) continue;
    const items = byColumn.get(column) ?? [];
    items.push({
      database: String(row.REFERENCED_TABLE_SCHEMA ?? ""),
      table: String(row.REFERENCED_TABLE_NAME ?? ""),
      field: String(row.REFERENCED_COLUMN_NAME ?? ""),
      constraintName: String(row.CONSTRAINT_NAME ?? ""),
    });
    byColumn.set(column, items);
  }
  return byColumn;
}

async function inspectMySql(connection, database, table, signal) {
  return withMySql(connection, async (client) => {
    const [columnRows] = await client.query(
      `SELECT COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [database, table],
    );
    if (!Array.isArray(columnRows) || columnRows.length === 0) throw new Error("没有找到该表，或当前账号无权读取表结构");
    const [indexRows] = await client.query(
      `SELECT COLUMN_NAME, INDEX_NAME, NON_UNIQUE
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [database, table],
    );
    const [referenceRows] = await client.query(
      `SELECT COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [database, table],
    );
    const [tableRows] = await client.query(
      `SELECT TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [database, table],
    );
    const indexes = mapIndexes(indexRows);
    const references = mapReferences(referenceRows);
    const tableComment = String(tableRows?.[0]?.TABLE_COMMENT ?? "");
    const fields = columnRows.map((row) => {
      const name = String(row.COLUMN_NAME);
      const index = indexes.get(name) ?? { indexed: false, unique: false, primaryKey: false };
      return {
        name,
        ordinal: Number(row.ORDINAL_POSITION),
        dataType: String(row.COLUMN_TYPE),
        nullable: String(row.IS_NULLABLE).toUpperCase() === "YES",
        defaultValue: row.COLUMN_DEFAULT === null || row.COLUMN_DEFAULT === undefined ? "" : String(row.COLUMN_DEFAULT),
        databaseComment: String(row.COLUMN_COMMENT ?? ""),
        businessName: "",
        customComment: "",
        semanticConceptId: "",
        enabled: true,
        sensitive: false,
        primaryKey: index.primaryKey,
        unique: index.unique,
        indexed: index.indexed,
        references: references.get(name) ?? [],
      };
    });
    return { tableComment, fields, metadataVersion: metadataVersion(tableComment, fields) };
  }, signal);
}

async function inspectClickHouse(connection, database, table, signal) {
  return withClickHouse(connection, async (client) => {
    const columns = await (await client.query({
      query: `SELECT name, position, type, default_expression, comment, is_in_primary_key, is_in_sorting_key
              FROM system.columns
              WHERE database = {db:String} AND table = {table:String}
              ORDER BY position`,
      query_params: { db: database, table },
      format: "JSONEachRow",
      abort_signal: signal,
    })).json();
    if (!Array.isArray(columns) || columns.length === 0) throw new Error("没有找到该表，或当前账号无权读取表结构");
    let tableComment = "";
    try {
      const tables = await (await client.query({
        query: "SELECT comment FROM system.tables WHERE database = {db:String} AND name = {table:String} LIMIT 1",
        query_params: { db: database, table },
        format: "JSONEachRow",
        abort_signal: signal,
      })).json();
      tableComment = String(tables?.[0]?.comment ?? "");
    } catch {
      // 较旧 ClickHouse 版本没有 system.tables.comment；字段元数据仍可正常使用。
    }
    const fields = columns.map((row) => ({
      name: String(row.name),
      ordinal: Number(row.position),
      dataType: String(row.type),
      nullable: /^Nullable\s*\(/i.test(String(row.type)),
      defaultValue: String(row.default_expression ?? ""),
      databaseComment: String(row.comment ?? ""),
      businessName: "",
      customComment: "",
      semanticConceptId: "",
      enabled: true,
      sensitive: false,
      primaryKey: Number(row.is_in_primary_key ?? 0) === 1,
      unique: false,
      indexed: Number(row.is_in_primary_key ?? 0) === 1 || Number(row.is_in_sorting_key ?? 0) === 1,
      references: [],
    }));
    return { tableComment, fields, metadataVersion: metadataVersion(tableComment, fields) };
  }, signal);
}

export async function inspectTableMetadata(connection, database, table, signal) {
  assertIdentifier(database, "数据库名称");
  assertIdentifier(table, "数据表名称");
  if (connection.type === "mysql") return inspectMySql(connection, database, table, signal);
  if (connection.type === "clickhouse") return inspectClickHouse(connection, database, table, signal);
  throw new Error("不支持的数据库类型");
}

export async function executeDatasetQuery(connection, dataset, request, signal) {
  const compiled = compileDatasetQuery(connection.type, dataset, request);
  if (connection.type === "mysql") {
    const rows = await withMySql(connection, async (client) => {
	  // mysql2 的 query(sql, values) 会按占位符转义绑定值；服务端仍只接收已通过
	  // 字段白名单和标识符校验的只读 SELECT。
      const [result] = await client.query({ sql: compiled.sql, timeout: TIMEOUT_MS, values: compiled.parameters });
      return Array.isArray(result) ? result : [];
    }, signal);
    return { columns: compiled.columns, rows: rows.slice(0, compiled.limit), limit: compiled.limit };
  }
  const rows = await withClickHouse(connection, async (client) => {
    return await (await client.query({
      query: compiled.sql,
      query_params: compiled.parameters,
      format: "JSONEachRow",
      abort_signal: signal,
    })).json();
  }, signal);
  return { columns: compiled.columns, rows: rows.slice(0, compiled.limit), limit: compiled.limit };
}

/** 一次执行完整的参数化只读 SELECT。流式消费，不通过 LIMIT 截断总结果。 */
export async function* streamDatasetRows(connection, compiled, signal) {
  signal?.throwIfAborted();
  if (connection.type === 'mysql') {
    const client = await mysql.createConnection({
      host: connection.host, port: connection.port, user: connection.username, password: connection.password,
      ...(connection.database ? { database: connection.database } : {}), connectTimeout: TIMEOUT_MS,
      supportBigNumbers: true, bigNumberStrings: true, dateStrings: true, jsonStrings: true,
    });
    const abort = () => client.destroy();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      signal?.throwIfAborted();
      const stream = client.connection.query({ sql: compiled.sql, values: compiled.parameters }).stream({ highWaterMark: 16 });
      for await (const row of stream) { signal?.throwIfAborted(); yield row; }
      signal?.throwIfAborted();
    } finally { signal?.removeEventListener('abort', abort); client.destroy(); }
    return;
  }
  const client = createClient({
    url: /^https?:\/\//.test(connection.host) ? connection.host : `http://${connection.host}:${connection.port}`,
    username: connection.username, password: connection.password, database: connection.database || 'default',
    request_timeout: 10 * 60 * 1000,
    clickhouse_settings: { send_progress_in_http_headers: 1, http_headers_progress_interval_ms: '10000' },
  });
  let result;
  try {
    result = await client.query({ query: compiled.sql, query_params: compiled.parameters, format: 'JSONEachRow', abort_signal: signal,
      clickhouse_settings: { result_overflow_mode: 'throw', read_overflow_mode: 'throw', timeout_overflow_mode: 'throw',
        output_format_json_quote_64bit_integers: 1, output_format_json_quote_decimals: 1 } });
    for await (const batch of result.stream()) for (const row of batch) { signal?.throwIfAborted(); yield row.json(); }
    signal?.throwIfAborted();
  } finally { result?.close(); await client.close(); }
}

function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

async function distinctHashes(connection, dataset, fieldName, limit, signal) {
  const database = quoteIdentifier(connection.type, dataset.database);
  const table = quoteIdentifier(connection.type, dataset.table);
  const field = quoteIdentifier(connection.type, fieldName);
  const safeLimit = Math.min(Math.max(Number(limit) || SAMPLE_DISTINCT_LIMIT, 20), SAMPLE_DISTINCT_LIMIT) + 1;
  const sql = `SELECT DISTINCT ${field} AS __semantic_value FROM ${database}.${table} WHERE ${field} IS NOT NULL LIMIT ${safeLimit}`;
  let rows;
  if (connection.type === "mysql") {
    rows = await withMySql(connection, async (client) => {
      const [result] = await client.query({ sql, timeout: TIMEOUT_MS });
      return result;
    }, signal);
  } else {
    rows = await withClickHouse(connection, async (client) => await (await client.query({
      query: sql,
      format: "JSONEachRow",
      abort_signal: signal,
    })).json(), signal);
  }
  const truncated = rows.length > safeLimit - 1;
  const values = rows.slice(0, safeLimit - 1).map((row) => hashValue(row.__semantic_value));
  return { hashes: new Set(values), truncated };
}

/** 原始值只在宿主内存中短暂存在；模型和持久化层只接收覆盖率统计。 */
export async function compareDistinctValues(sourceConnection, sourceDataset, sourceField, targetConnection, targetDataset, targetField, signal) {
  const [source, target] = await Promise.all([
    distinctHashes(sourceConnection, sourceDataset, sourceField, SAMPLE_DISTINCT_LIMIT, signal),
    distinctHashes(targetConnection, targetDataset, targetField, SAMPLE_DISTINCT_LIMIT, signal),
  ]);
  let matched = 0;
  for (const hash of source.hashes) if (target.hashes.has(hash)) matched += 1;
  let reverseMatched = 0;
  for (const hash of target.hashes) if (source.hashes.has(hash)) reverseMatched += 1;
  return {
    sourceDistinct: source.hashes.size,
    targetDistinct: target.hashes.size,
    matchedDistinct: matched,
    coverage: source.hashes.size === 0 ? 0 : matched / source.hashes.size,
    reverseCoverage: target.hashes.size === 0 ? 0 : reverseMatched / target.hashes.size,
    truncated: source.truncated || target.truncated,
  };
}
