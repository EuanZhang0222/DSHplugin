import test from "node:test";
import assert from "node:assert/strict";
import { buildSemanticSnapshot, findConfirmedJoinPath, getDatasetContext } from "../lib/semantic/context.js";
import { buildRelationPrompt, parseRelationModelOutput } from "../lib/semantic/model.js";

const config = {
  semanticVersion: 3,
  connections: [{ id: "c1", name: "生产库", type: "mysql", host: "10.0.0.1", username: "root", password: "secret" }],
  semanticConcepts: [{ id: "meter-id", name: "计量设备标识", definition: "唯一标识计量设备", aliases: [] }],
  datasets: [
    { id: "reading", connectionId: "c1", database: "energy", table: "reading", name: "采集明细", purpose: "事实表", enabled: true, fields: [{ name: "meter_id", dataType: "varchar(64)", enabled: true, semanticConceptId: "meter-id" }, { name: "token", dataType: "text", enabled: true, sensitive: true }] },
    { id: "meter", connectionId: "c1", database: "energy", table: "meter", name: "设备档案", purpose: "主数据", enabled: true, fields: [{ name: "code", dataType: "varchar(64)", enabled: true, semanticConceptId: "meter-id", unique: true }] },
  ],
  relations: [
    { id: "r1", source: { datasetId: "reading", field: "meter_id" }, target: { datasetId: "meter", field: "code" }, cardinality: "many-to-one", status: "confirmed", origin: "manual", confidence: 90 },
    { id: "r2", source: { datasetId: "reading", field: "meter_id" }, target: { datasetId: "meter", field: "code" }, cardinality: "many-to-one", status: "candidate", origin: "llm", confidence: 95 },
  ],
  topologies: [{ id: "top", name: "计量拓扑", purpose: "计量", enabled: true, datasetIds: ["reading", "meter"], relationIds: ["r1", "r2"] }],
};

test("语义快照不包含密码、敏感字段和未确认关系", () => {
  const snapshot = buildSemanticSnapshot(config);
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /secret/);
  assert.doesNotMatch(serialized, /10\.0\.0\.1/);
  assert.doesNotMatch(serialized, /token/);
  assert.equal(snapshot.relations.length, 1);
  assert.equal(getDatasetContext(config, "reading").relations.length, 1);
});

test("仅用已确认关系搜索拓扑路径", () => {
  const path = findConfirmedJoinPath(config, "reading", "meter", "top");
  assert.equal(path.length, 1);
  assert.equal(path[0].id, "r1");
});

test("大模型输出只能引用本次提示词白名单字段", () => {
  const topology = config.topologies[0];
  const prompt = buildRelationPrompt({ topology, datasets: config.datasets, concepts: config.semanticConcepts, ruleCandidates: [] });
  const parsed = parseRelationModelOutput(JSON.stringify({ relations: [{ source: { datasetId: "reading", field: "meter_id" }, target: { datasetId: "meter", field: "code" }, decision: "candidate", cardinality: "many-to-one", reason: "同一计量设备标识" }] }), prompt.allowedEndpoints);
  assert.equal(parsed.length, 1);
  assert.throws(() => parseRelationModelOutput(JSON.stringify({ relations: [{ source: { datasetId: "reading", field: "missing" }, target: { datasetId: "meter", field: "code" }, decision: "candidate", cardinality: "many-to-one", reason: "编造字段" }] }), prompt.allowedEndpoints), /白名单/);
});
