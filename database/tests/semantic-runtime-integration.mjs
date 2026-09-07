import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const installedRoot = process.env.SEMANTIC_INSTALLED_PLUGIN;
if (!installedRoot) throw new Error('缺少 SEMANTIC_INSTALLED_PLUGIN（已安装插件路径）');
const { createSemanticRuntime } = await import(pathToFileURL(`${installedRoot}/lib/semantic/runtime.js`).href);

let config = {
  connections: [{ id: 'fixture', name: '本地协议测试 MySQL', type: 'mysql', host: '127.0.0.1', port: Number(process.env.SEMANTIC_FIXTURE_PORT || 33306), username: 'fixture', password: 'fixture', database: 'semantic_fixture' }],
  semanticSchemaVersion: 1,
  semanticVersion: 1,
  datasets: [],
  semanticConcepts: [],
  relations: [],
  topologies: [],
  modelConfig: { provider: '', model: '', maxTokens: 2048, timeoutMs: 60000 },
  auditLog: [],
};
const scope = { get: () => config, async replace(next) { config = structuredClone(next); } };
const sctx = { get: () => undefined };
const runtime = createSemanticRuntime(scope, sctx);

const meterMetadata = await runtime.inspectDataset({ connectionId: 'fixture', database: 'semantic_fixture', table: 'meter' });
const readingMetadata = await runtime.inspectDataset({ connectionId: 'fixture', database: 'semantic_fixture', table: 'meter_reading' });
assert.equal(meterMetadata.tableComment, '计量设备主数据表');
assert.equal(readingMetadata.fields.find((field) => field.name === 'meter_id').references[0].table, 'meter');
assert.equal(readingMetadata.fields.find((field) => field.name === 'active_energy').dataType, 'decimal(18,4)');

const concept = (await runtime.saveConcept({ name: '计量设备标识', definition: '一只计量设备的统一业务编码', aliases: ['电表ID', 'meter code'] })).concept;
const meter = (await runtime.saveDataset({
  name: '计量设备档案', connectionId: 'fixture', database: 'semantic_fixture', table: 'meter', purpose: '计量设备主数据',
  fields: meterMetadata.fields.map((field) => field.name === 'id' ? { ...field, businessName: '计量设备标识', customComment: '跨采集表使用的设备统一编码', semanticConceptId: concept.id } : field),
})).dataset;
const reading = (await runtime.saveDataset({
  name: '电表采集明细', connectionId: 'fixture', database: 'semantic_fixture', table: 'meter_reading', purpose: '分钟级电表累计量事实表',
  fields: readingMetadata.fields.map((field) => field.name === 'meter_id' ? { ...field, businessName: '计量设备标识', customComment: '关联计量设备档案', semanticConceptId: concept.id } : field.name === 'secret_note' ? { ...field, sensitive: true } : field),
})).dataset;
assert.equal(reading.fields.find((field) => field.name === 'secret_note').sensitive, true);

const topology = (await runtime.saveTopology({ name: '本地能源计量拓扑', purpose: '测试采集明细到设备主数据的关系', datasetIds: [reading.id, meter.id], relationIds: [], enabled: true })).topology;
const identified = await runtime.identifyByRules(topology.id, true);
assert.ok(identified.candidates.length >= 1);
const fk = identified.candidates.find((relation) => relation.source.field === 'meter_id' && relation.target.field === 'id');
assert.ok(fk, '应识别 meter_reading.meter_id -> meter.id');
assert.equal(fk.origin, 'database');
assert.equal(fk.confidence, 100);
await runtime.confirmRelation(fk.id);

const context = runtime.getTopologyContext(topology.id);
assert.equal(context.relations.length, 1);
assert.equal(context.relations[0].status, 'confirmed');
assert.ok(context.datasets.every((dataset) => dataset.fields.every((field) => field.name !== 'secret_note')));

const result = await runtime.queryDataset(reading.id, { fields: ['meter_id', 'collect_time', 'active_energy'], filters: [{ field: 'meter_id', operator: 'eq', value: 'M-001' }], limit: 10 });
assert.equal(result.rows.length, 1);
assert.equal(result.rows[0].meter_id, 'M-001');
assert.ok(!Object.hasOwn(result.rows[0], 'secret_note'));
assert.ok(config.semanticVersion > 1);

console.log(JSON.stringify({
  ok: true,
  datasets: config.datasets.length,
  fields: config.datasets.reduce((sum, dataset) => sum + dataset.fields.length, 0),
  confirmedRelations: config.relations.filter((relation) => relation.status === 'confirmed').length,
  queryRows: result.rows.length,
  semanticVersion: config.semanticVersion,
}, null, 2));
