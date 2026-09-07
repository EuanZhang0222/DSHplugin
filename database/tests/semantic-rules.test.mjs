import test from "node:test";
import assert from "node:assert/strict";
import {
  generateRuleCandidates,
  getRuleDefinition,
  inferCardinality,
  scoreRelationPair,
  typeCompatibility,
} from "../lib/semantic/rules.js";

const connectionId = "conn-1";
const meter = {
  id: "meter",
  connectionId,
  database: "energy_platform",
  table: "t_energy_meter",
  enabled: true,
  fields: [
    { name: "meter_code", dataType: "varchar(64)", businessName: "计量设备标识", customComment: "设备统一编码", semanticConceptId: "meter-id", primaryKey: false, unique: true, indexed: true, enabled: true },
    { name: "area_id", dataType: "bigint", businessName: "所属区域标识", semanticConceptId: "area-id", indexed: true, enabled: true, references: [{ database: "energy_platform", table: "t_factory_area", field: "id" }] },
  ],
};
const reading = {
  id: "reading",
  connectionId,
  database: "energy_platform",
  table: "t_energy_meter_reading",
  enabled: true,
  fields: [
    { name: "meter_id", dataType: "varchar(64)", databaseComment: "电表ID", businessName: "计量设备标识", customComment: "关联设备统一编码", semanticConceptId: "meter-id", indexed: true, enabled: true },
    { name: "collect_time", dataType: "datetime", businessName: "采集时间", enabled: true },
  ],
};
const area = {
  id: "area",
  connectionId,
  database: "energy_platform",
  table: "t_factory_area",
  enabled: true,
  fields: [
    { name: "id", dataType: "bigint", databaseComment: "区域主键", businessName: "区域标识", semanticConceptId: "area-id", primaryKey: true, unique: true, indexed: true, enabled: true },
  ],
};

test("规则定义是可量化的100分模型", () => {
  const definition = getRuleDefinition();
  assert.equal(Object.values(definition.weights).reduce((sum, value) => sum + value, 0), 100);
  assert.equal(definition.thresholds.high, 85);
  assert.ok(definition.hardGates.length >= 5);
});

test("显式数据库外键获得完整键结构证据", () => {
  const result = scoreRelationPair({
    sourceDataset: meter,
    sourceField: meter.fields[1],
    targetDataset: area,
    targetField: area.fields[0],
  });
  assert.equal(result.explicitForeignKey, true);
  assert.equal(result.cardinality, "many-to-one");
  assert.equal(result.evidence.find((item) => item.code === "key-structure").score, 30);
  assert.equal(result.confidence, 100);
  assert.equal(result.hardBlocks.length, 0);
});

test("统一语义、兼容类型和高值覆盖率形成真实高可信候选", () => {
  const result = scoreRelationPair({
    sourceDataset: reading,
    sourceField: reading.fields[0],
    targetDataset: meter,
    targetField: meter.fields[0],
    sampleMetrics: { coverage: 0.998, sourceDistinct: 1000, targetDistinct: 1100, matchedDistinct: 998 },
  });
  assert.equal(result.eligible, true);
  assert.ok(result.confidence >= 85, `实际分数为 ${result.confidence}`);
  assert.equal(result.cardinality, "many-to-one");
  assert.equal(result.evidence.find((item) => item.code === "value-overlap").score, 15);
});

test("不兼容字段类型被硬阻断", () => {
  const result = scoreRelationPair({
    sourceDataset: reading,
    sourceField: reading.fields[1],
    targetDataset: meter,
    targetField: meter.fields[0],
  });
  assert.equal(result.eligible, false);
  assert.ok(result.hardBlocks.some((item) => item.includes("不兼容")));
  assert.equal(typeCompatibility("datetime", "varchar(64)").compatible, false);
});

test("关系基数由唯一性确定，而不是大模型猜测", () => {
  assert.equal(inferCardinality({ unique: false }, { unique: true }), "many-to-one");
  assert.equal(inferCardinality({ unique: true }, { unique: true }), "one-to-one");
  assert.equal(inferCardinality({ unique: true }, { unique: false }), "one-to-many");
  assert.equal(inferCardinality({ unique: false }, { unique: false }), "many-to-many");
});

test("规则候选只枚举当前拓扑中的数据集", () => {
  const result = generateRuleCandidates([reading, meter, area], { datasetIds: ["reading", "meter"] }, { limit: 20 });
  assert.ok(result.length >= 1);
  assert.ok(result.every((candidate) => ![candidate.source.datasetId, candidate.target.datasetId].includes("area")));
});
