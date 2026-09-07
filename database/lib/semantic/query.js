/** 数据集安全查询编译器：只接受结构化字段、过滤和排序，不接受 Agent 原始 SQL。 */

export const DATASET_QUERY_MAX_ROWS = 200;
export const DATASET_QUERY_DEFAULT_ROWS = 100;

// 真实目录中可能含 topv-prod 这类名称；所有标识符仍逐段使用反引号包裹。
// 只增加连字符，继续拒绝引号、反引号、反斜线、点号、分号和控制字符。
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$-]*$/;
const FILTER_OPERATORS = new Set(["eq", "ne", "gt", "gte", "lt", "lte", "in", "like", "is-null", "not-null"]);
const ORDER_DIRECTIONS = new Set(["asc", "desc"]);

export class SemanticQueryError extends Error {
  constructor(message) {
    super(message);
    this.name = "SemanticQueryError";
  }
}

export function assertIdentifier(value, label = "数据库标识") {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    throw new SemanticQueryError(`${label}包含不受支持的字符`);
  }
  return value;
}

export function quoteIdentifier(kind, value) {
  const identifier = assertIdentifier(value);
  if (kind !== "mysql" && kind !== "clickhouse") throw new SemanticQueryError("不支持的数据库类型");
  return `\`${identifier.replace(/`/g, "``")}\``;
}

function unwrapClickHouseType(value) {
  let type = String(value ?? "String").trim();
  let previous = "";
  while (type !== previous) {
    previous = type;
    type = type
      .replace(/^Nullable\s*\((.*)\)$/i, "$1")
      .replace(/^LowCardinality\s*\((.*)\)$/i, "$1")
      .trim();
  }
  const safe = /^(?:U?Int(?:8|16|32|64|128|256)|Float(?:32|64)|Decimal(?:32|64|128|256)?\(\d+(?:\s*,\s*\d+)?\)|String|FixedString\(\d+\)|Date|Date32|DateTime(?:\([^)]*\))?|DateTime64\([^)]*\)|UUID)$/i;
  return safe.test(type) ? type : "String";
}

function fieldMap(dataset) {
  return new Map((Array.isArray(dataset.fields) ? dataset.fields : [])
    .filter((field) => field.enabled !== false)
    .map((field) => [field.name, field]));
}

function readField(map, value, label) {
  if (typeof value !== "string" || value.length === 0) throw new SemanticQueryError(`${label}不能为空`);
  const field = map.get(value);
  if (!field) throw new SemanticQueryError(`${label}“${value}”不属于该数据集或未启用`);
  if (field.sensitive === true) throw new SemanticQueryError(`${label}“${value}”被标记为敏感字段，不能通过语义查询调用`);
  return field;
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === "") return DATASET_QUERY_DEFAULT_ROWS;
  if (!Number.isInteger(value) || value < 1) throw new SemanticQueryError("limit（返回行数）必须是正整数");
  return Math.min(value, DATASET_QUERY_MAX_ROWS);
}

function mysqlPlaceholder(parameters, value) {
  parameters.push(value);
  return "?";
}

function clickHousePlaceholder(parameters, field, value) {
  const name = `p${Object.keys(parameters).length}`;
  parameters[name] = value;
  return `{${name}:${unwrapClickHouseType(field.dataType)}}`;
}

function compileFilter(kind, filter, fields, parameters) {
  if (typeof filter !== "object" || filter === null || Array.isArray(filter)) {
    throw new SemanticQueryError("过滤条件必须是对象");
  }
  const field = readField(fields, filter.field, "过滤字段");
  const operator = typeof filter.operator === "string" ? filter.operator : "eq";
  if (!FILTER_OPERATORS.has(operator)) throw new SemanticQueryError(`不支持的过滤操作符：${operator}`);
  const column = quoteIdentifier(kind, field.name);
  if (operator === "is-null") return `${column} IS NULL`;
  if (operator === "not-null") return `${column} IS NOT NULL`;
  if (operator === "in") {
    if (!Array.isArray(filter.value) || filter.value.length === 0) throw new SemanticQueryError("IN（集合包含）过滤必须提供非空数组");
    if (filter.value.length > 100) throw new SemanticQueryError("单个 IN（集合包含）过滤最多100个值");
    if (kind === "mysql") {
      return `${column} IN (${filter.value.map((value) => mysqlPlaceholder(parameters, value)).join(", ")})`;
    }
    const name = `p${Object.keys(parameters).length}`;
    parameters[name] = filter.value;
    return `${column} IN {${name}:Array(${unwrapClickHouseType(field.dataType)})}`;
  }
  if (filter.value === undefined) throw new SemanticQueryError(`过滤字段“${field.name}”缺少比较值`);
  const placeholder = kind === "mysql"
    ? mysqlPlaceholder(parameters, filter.value)
    : clickHousePlaceholder(parameters, field, filter.value);
  const sqlOperator = {
    eq: "=",
    ne: "!=",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    like: "LIKE",
  }[operator];
  return `${column} ${sqlOperator} ${placeholder}`;
}

/**
 * 编译单数据集的只读查询。返回 SQL 与驱动参数，调用方必须使用参数化执行。
 */
export function compileDatasetQuery(kind, dataset, request = {}, { fullResult = false } = {}) {
  if (!dataset || dataset.enabled === false) throw new SemanticQueryError("数据集不存在或未启用");
  const fields = fieldMap(dataset);
  if (fields.size === 0) throw new SemanticQueryError("数据集没有可查询字段");
  const requestedFields = Array.isArray(request.fields) && request.fields.length > 0
    ? request.fields
    : [...fields.values()].filter((field) => field.sensitive !== true).map((field) => field.name);
  if (requestedFields.length > (fullResult ? 1000 : 100)) throw new SemanticQueryError("查询字段超过允许数量");
  if (new Set(requestedFields).size !== requestedFields.length) throw new SemanticQueryError("查询字段不能重复");
  const selected = requestedFields.map((fieldName) => readField(fields, fieldName, "查询字段"));
  if (!selected.length) throw new SemanticQueryError("数据集没有可查询的非敏感字段");
  const parameters = kind === "mysql" ? [] : {};
  const database = quoteIdentifier(kind, dataset.database);
  const table = quoteIdentifier(kind, dataset.table);
  let sql = `SELECT ${selected.map((field) => quoteIdentifier(kind, field.name)).join(", ")} FROM ${database}.${table}`;

  const filters = Array.isArray(request.filters) ? request.filters : [];
  if (filters.length > 20) throw new SemanticQueryError("单次最多20个过滤条件");
  if (filters.length > 0) {
    sql += ` WHERE ${filters.map((filter) => compileFilter(kind, filter, fields, parameters)).join(" AND ")}`;
  }

  const orderBy = Array.isArray(request.orderBy) ? request.orderBy : [];
  if (orderBy.length > 5) throw new SemanticQueryError("单次最多5个排序字段");
  if (orderBy.length > 0) {
    sql += ` ORDER BY ${orderBy.map((item) => {
      if (typeof item !== "object" || item === null) throw new SemanticQueryError("排序条件必须是对象");
      const field = readField(fields, item.field, "排序字段");
      const direction = String(item.direction ?? "asc").toLowerCase();
      if (!ORDER_DIRECTIONS.has(direction)) throw new SemanticQueryError("排序方向必须是 asc（升序）或 desc（降序）");
      return `${quoteIdentifier(kind, field.name)} ${direction.toUpperCase()}`;
    }).join(", ")}`;
  }
  const limit = normalizeLimit(request.limit);
  // Full-result collection is an internal mode, never a raw SQL/client bypass.
  // limit remains a PAGE size; a single read-only SELECT captures every matching row.
  if (!fullResult) sql += ` LIMIT ${limit}`;
  return {
    sql,
    parameters,
    columns: selected.map((field) => field.name),
    limit,
  };
}
