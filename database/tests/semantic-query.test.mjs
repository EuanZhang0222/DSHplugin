import test from "node:test";
import assert from "node:assert/strict";
import { compileDatasetQuery, SemanticQueryError } from "../lib/semantic/query.js";

const dataset = {
  id: "reading",
  database: "energy_platform",
  table: "t_energy_meter_reading",
  enabled: true,
  fields: [
    { name: "meter_id", dataType: "varchar(64)", enabled: true },
    { name: "active_energy", dataType: "decimal(18,4)", enabled: true },
    { name: "secret_token", dataType: "varchar(64)", enabled: true, sensitive: true },
  ],
};

test("MySQL 数据集查询使用参数占位符和白名单字段", () => {
  const compiled = compileDatasetQuery("mysql", dataset, {
    fields: ["meter_id", "active_energy"],
    filters: [{ field: "meter_id", operator: "eq", value: "MTR-1' OR 1=1" }],
    orderBy: [{ field: "active_energy", direction: "desc" }],
    limit: 50,
  });
  assert.match(compiled.sql, /WHERE `meter_id` = \?/);
  assert.doesNotMatch(compiled.sql, /OR 1=1/);
  assert.deepEqual(compiled.parameters, ["MTR-1' OR 1=1"]);
  assert.equal(compiled.limit, 50);
});

test("ClickHouse 数据集查询使用强类型查询参数", () => {
  const compiled = compileDatasetQuery("clickhouse", dataset, {
    fields: ["active_energy"],
    filters: [{ field: "active_energy", operator: "gte", value: 10 }],
  });
  assert.match(compiled.sql, /\{p0:decimal\(18,4\)\}/i);
  assert.deepEqual(compiled.parameters, { p0: 10 });
});

test("敏感字段和非法标识不能进入查询", () => {
  assert.throws(() => compileDatasetQuery("mysql", dataset, { fields: ["secret_token"] }), SemanticQueryError);
  assert.throws(() => compileDatasetQuery("mysql", { ...dataset, table: "x`; DROP TABLE y;--" }, {}), SemanticQueryError);
});

test("查询行数强制截断到200", () => {
  assert.equal(compileDatasetQuery("mysql", dataset, { limit: 9999 }).limit, 200);
});

test("真实含连字符的库表名在 MySQL 和 ClickHouse 中按独立标识符安全引用", () => {
  for (const kind of ["mysql", "clickhouse"]) {
    const compiled = compileDatasetQuery(kind, { ...dataset, database: "topv-prod", table: "meter-reading" }, { fields: ["meter_id"] });
    assert.match(compiled.sql, /FROM `topv-prod`\.`meter-reading`/);
  }
});

test("放行连字符不放行 SQL 分隔符、引号或控制字符", () => {
  for (const database of ["x`;DROP TABLE y;--", "x.y", "x'y", 'x"y', "x\\y", "x\ny", "x\0y", "x;y"]) {
    assert.throws(() => compileDatasetQuery("mysql", { ...dataset, database }, {}), SemanticQueryError);
  }
});
