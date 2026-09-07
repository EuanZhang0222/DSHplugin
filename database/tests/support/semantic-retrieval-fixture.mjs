export function fixture() {
  const f = (name, meaning, more = {}) => ({ name, dataType: 'varchar(64)', databaseComment: meaning, businessName: meaning, enabled: true, ...more });
  const d = (id, name, fields) => ({ id, name, connectionId: 'c', database: 'energy', table: id, purpose: name, enabled: true, fields });
  return { semanticVersion: 7, connections: [{ id: 'c', name: '能源数据库', type: 'mysql', username: 'never-user', password: 'never-password' }],
    datasets: [d('reading', '用电采集明细', [f('id', '主键', { primaryKey: true, unique: true }), f('meter_id', '计量设备标识', { semanticConceptId: 'device' }), f('active_energy', '累计用电量'), f('collect_time', '采集时间'), f('remark', '一般备注'), f('secret', '不可见密码', { sensitive: true }), f('disabled', '已停用描述', { enabled: false })]),
      d('meter', '计量设备档案', [f('id', '设备主键', { primaryKey: true, unique: true, semanticConceptId: 'device' }), f('area_id', '区域标识'), f('unit', '单位'), f('remark', '设备备注')]),
      d('area', '园区区域', [f('id', '区域主键', { primaryKey: true, unique: true }), f('area_name', '区域名称')]),
      d('unrelated', '商品销售', [f('sku', '商品编号'), f('money', '销售额')])],
    semanticConcepts: [{ id: 'device', name: '计量设备标识', definition: '同一只计量设备的统一标识', aliases: ['电表编码', 'meterkey'] }, { id: 'unused', name: '不相关概念', definition: '不应该发给模型' }],
    relations: [{ id: 'r1', source: { datasetId: 'reading', field: 'meter_id' }, target: { datasetId: 'meter', field: 'id' }, cardinality: 'many-to-one', status: 'confirmed', businessDescription: '采集明细属于一台设备' }, { id: 'r2', source: { datasetId: 'meter', field: 'area_id' }, target: { datasetId: 'area', field: 'id' }, cardinality: 'many-to-one', status: 'confirmed', businessDescription: '设备属于区域' }],
    topologies: [{ id: 't', name: '能源计量拓扑', purpose: '采集到区域', datasetIds: ['reading', 'meter', 'area', 'unrelated'], relationIds: ['r1', 'r2'], enabled: true }],
    modelConfig: { provider: 'fixture', model: 'fixture-model', maxTokens: 2048, timeoutMs: 60000 }, auditLog: [] };
}
