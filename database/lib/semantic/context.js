/** 已发布语义上下文构建器。只输出启用数据集和人工确认关系。 */
import { semanticScope } from "./retrieval.js";

export const SEMANTIC_CONTEXT_VERSION = "database-semantic-context/1.0.0";

function publicField(field, conceptsById) {
  const concept = field.semanticConceptId ? conceptsById.get(field.semanticConceptId) : undefined;
  return {
    name: field.name,
    dataType: field.dataType,
    nullable: field.nullable === true,
    primaryKey: field.primaryKey === true,
    unique: field.unique === true,
    indexed: field.indexed === true,
    databaseComment: field.databaseComment || "",
    businessName: field.businessName || "",
    businessComment: field.customComment || "",
    semanticConcept: concept ? {
      id: concept.id,
      name: concept.name,
      definition: concept.definition,
    } : undefined,
  };
}

function publicDataset(dataset, connectionsById, conceptsById, includeFields = true) {
  const connection = connectionsById.get(dataset.connectionId);
  return {
    id: dataset.id,
    name: dataset.name,
    purpose: dataset.purpose,
    source: {
      connectionId: dataset.connectionId,
      connectionName: connection?.name ?? "已删除的连接",
      databaseType: connection?.type ?? "unknown",
      database: dataset.database,
      table: dataset.table,
      tableComment: dataset.tableComment || "",
    },
    enabled: dataset.enabled !== false,
    metadataVersion: dataset.metadataVersion || "",
    updatedAt: dataset.updatedAt || "",
    ...(includeFields ? {
      fields: (Array.isArray(dataset.fields) ? dataset.fields : [])
        .filter((field) => field.enabled !== false && field.sensitive !== true)
        .map((field) => publicField(field, conceptsById)),
    } : {}),
  };
}

function endpointContext(endpoint, datasetsById, connectionsById) {
  const dataset = datasetsById.get(endpoint.datasetId);
  const connection = dataset ? connectionsById.get(dataset.connectionId) : undefined;
  return {
    datasetId: endpoint.datasetId,
    datasetName: dataset?.name ?? "未知数据集",
    connectionId: dataset?.connectionId ?? endpoint.connectionId ?? "",
    connectionName: connection?.name ?? "未知连接",
    database: dataset?.database ?? endpoint.database ?? "",
    table: dataset?.table ?? endpoint.table ?? "",
    field: endpoint.field,
  };
}

function publicRelation(relation, datasetsById, connectionsById) {
  return {
    id: relation.id,
    type: relation.cardinality,
    source: endpointContext(relation.source, datasetsById, connectionsById),
    target: endpointContext(relation.target, datasetsById, connectionsById),
    businessDescription: relation.businessDescription || "",
    origin: relation.origin,
    status: relation.status,
    confidence: relation.confidence,
    ruleVersion: relation.ruleVersion || "",
    confirmedAt: relation.confirmedAt || "",
    updatedAt: relation.updatedAt || "",
  };
}

export function buildSemanticSnapshot(config, options = {}) {
  const connections = Array.isArray(config.connections) ? config.connections : [];
  const datasets = (Array.isArray(config.datasets) ? config.datasets : []).filter((dataset) => dataset.enabled !== false);
  const concepts = Array.isArray(config.semanticConcepts) ? config.semanticConcepts : [];
  const relationships = semanticScope(config).relations;
  const topologies = (Array.isArray(config.topologies) ? config.topologies : []).filter((topology) => topology.enabled !== false);
  const connectionsById = new Map(connections.map((connection) => [connection.id, connection]));
  const datasetsById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
  const conceptsById = new Map(concepts.map((concept) => [concept.id, concept]));
  const relationById = new Map(relationships.map((relation) => [relation.id, relation]));
  const includeFields = options.includeFields !== false;
  return {
    contextVersion: SEMANTIC_CONTEXT_VERSION,
    generatedAt: new Date().toISOString(),
    semanticVersion: Number.isInteger(config.semanticVersion) ? config.semanticVersion : 1,
    datasets: datasets.map((dataset) => publicDataset(dataset, connectionsById, conceptsById, includeFields)),
    concepts: concepts.map((concept) => ({
      id: concept.id,
      name: concept.name,
      definition: concept.definition,
      aliases: Array.isArray(concept.aliases) ? concept.aliases : [],
    })),
    relations: relationships
      .filter((relation) => datasetsById.has(relation.source.datasetId) && datasetsById.has(relation.target.datasetId))
      .map((relation) => publicRelation(relation, datasetsById, connectionsById)),
    topologies: topologies.map((topology) => ({
      id: topology.id,
      name: topology.name,
      purpose: topology.purpose,
      datasets: (Array.isArray(topology.datasetIds) ? topology.datasetIds : [])
        .map((id) => datasetsById.get(id))
        .filter(Boolean)
        .map((dataset) => publicDataset(dataset, connectionsById, conceptsById, false)),
      relations: (Array.isArray(topology.relationIds) ? topology.relationIds : [])
        .map((id) => relationById.get(id))
        .filter(Boolean)
        .filter((relation) => datasetsById.has(relation.source.datasetId) && datasetsById.has(relation.target.datasetId))
        .map((relation) => publicRelation(relation, datasetsById, connectionsById)),
    })),
    excluded: ["数据库连接凭据（用户名和密码）", "敏感字段", "未确认候选关系", "已停用数据集"],
  };
}

export function getDatasetContext(config, datasetId) {
  const snapshot = buildSemanticSnapshot(config);
  const dataset = snapshot.datasets.find((item) => item.id === datasetId);
  if (!dataset) return undefined;
  return {
    contextVersion: snapshot.contextVersion,
    generatedAt: snapshot.generatedAt,
    semanticVersion: snapshot.semanticVersion,
    dataset,
    concepts: snapshot.concepts.filter((concept) => dataset.fields.some((field) => field.semanticConcept?.id === concept.id)),
    relations: snapshot.relations.filter((relation) => relation.source.datasetId === datasetId || relation.target.datasetId === datasetId),
    topologies: snapshot.topologies
      .filter((topology) => topology.datasets.some((item) => item.id === datasetId))
      .map((topology) => ({ id: topology.id, name: topology.name, purpose: topology.purpose })),
    excluded: snapshot.excluded,
  };
}

export function getTopologyContext(config, topologyId) {
  const snapshot = buildSemanticSnapshot(config);
  const topology = snapshot.topologies.find((item) => item.id === topologyId);
  if (!topology) return undefined;
  const datasetIds = new Set(topology.datasets.map((dataset) => dataset.id));
  return {
    contextVersion: snapshot.contextVersion,
    generatedAt: snapshot.generatedAt,
    semanticVersion: snapshot.semanticVersion,
    topology,
    datasets: snapshot.datasets.filter((dataset) => datasetIds.has(dataset.id)),
    relations: topology.relations,
    concepts: snapshot.concepts.filter((concept) => snapshot.datasets
      .filter((dataset) => datasetIds.has(dataset.id))
      .some((dataset) => dataset.fields.some((field) => field.semanticConcept?.id === concept.id))),
    excluded: snapshot.excluded,
  };
}

export function findConfirmedJoinPath(config, fromDatasetId, toDatasetId, topologyId) {
  const scope = semanticScope(config, topologyId);
  if (!scope.byId.has(fromDatasetId) || !scope.byId.has(toDatasetId)) return undefined;
  if (fromDatasetId === toDatasetId) return [];
  const relations = scope.relations;
  const topology = topologyId
    ? (Array.isArray(config.topologies) ? config.topologies : []).find((item) => item.id === topologyId)
    : undefined;
  const allowedRelationIds = topology ? new Set(topology.relationIds ?? []) : undefined;
  const graph = new Map();
  for (const relation of relations) {
    if (allowedRelationIds && !allowedRelationIds.has(relation.id)) continue;
    for (const [from, to] of [[relation.source.datasetId, relation.target.datasetId], [relation.target.datasetId, relation.source.datasetId]]) {
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from).push({ to, relation });
    }
  }
  const queue = [{ datasetId: fromDatasetId, path: [] }];
  const visited = new Set([fromDatasetId]);
  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of graph.get(current.datasetId) ?? []) {
      if (visited.has(edge.to)) continue;
      const path = [...current.path, edge.relation];
      if (edge.to === toDatasetId) return path;
      visited.add(edge.to);
      queue.push({ datasetId: edge.to, path });
    }
  }
  return undefined;
}
