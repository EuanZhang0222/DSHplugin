import { randomUUID } from "node:crypto";
import {
  buildSemanticSnapshot,
  findConfirmedJoinPath,
  getDatasetContext,
  getTopologyContext,
} from "./context.js";
import { compareDistinctValues, inspectTableMetadata, streamDatasetRows } from "./db.js";
import { createDatasetQueryStore } from "./query-snapshots.js";
import { buildRelationPrompt, LLM_RELATION_PROMPT_VERSION, parseRelationModelOutput } from "./model.js";
import {
  generateRuleCandidates,
  getRuleDefinition,
  RELATION_RULE_VERSION,
  RELATION_THRESHOLDS,
  scoreRelationPair,
  typeCompatibility,
} from "./rules.js";
import { normalizedSemanticConfig } from "./schema.js";
import { fitContext, resolveContextBudget, reserveResponse } from "./budget.js";
import { prepareTaskContext, searchDatasetCatalog, searchDatasetFields } from "./retrieval.js";
import { relationBatchPlan } from "./relation-batches.js";

const MAX_DATASETS = 500;
const MAX_FIELDS_PER_DATASET = 1000;
const MAX_CONCEPTS = 2000;
const MAX_RELATIONS = 10000;
const MAX_TOPOLOGIES = 200;
const MAX_AUDIT_ENTRIES = 500;
const MAX_SAMPLE_CANDIDATES = 20;

export class SemanticApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "SemanticApiError";
    this.status = status;
  }
}

function now() {
  return new Date().toISOString();
}

function nonEmptyString(value, label, maxLength = 500) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length === 0) throw new SemanticApiError(400, `${label}不能为空`);
  if (result.length > maxLength) throw new SemanticApiError(400, `${label}不能超过${maxLength}个字符`);
  return result;
}

function optionalString(value, maxLength = 5000) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > maxLength) throw new SemanticApiError(400, `文本不能超过${maxLength}个字符`);
  return result;
}

function uniqueStrings(value, maxItems = 200) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, maxItems);
}

function configView(value) {
  return { ...value, ...normalizedSemanticConfig(value) };
}

function publicState(value) {
  const config = configView(value);
  return {
    semanticSchemaVersion: config.semanticSchemaVersion,
    semanticVersion: config.semanticVersion,
    datasets: config.datasets,
    semanticConcepts: config.semanticConcepts,
    relations: config.relations,
    topologies: config.topologies,
    modelConfig: config.modelConfig,
  };
}

function audit(config, action, entityType, entityId, summary) {
  const entry = { id: randomUUID(), at: now(), action, entityType, entityId, summary };
  return [...config.auditLog, entry].slice(-MAX_AUDIT_ENTRIES);
}

function connectionById(config, connectionId) {
  const connection = (config.connections ?? []).find((item) => item.id === connectionId);
  if (!connection) throw new SemanticApiError(404, "数据库连接不存在");
  return connection;
}

function datasetById(config, datasetId) {
  const dataset = config.datasets.find((item) => item.id === datasetId);
  if (!dataset) throw new SemanticApiError(404, "数据集不存在");
  return dataset;
}

function topologyById(config, topologyId) {
  const topology = config.topologies.find((item) => item.id === topologyId);
  if (!topology) throw new SemanticApiError(404, "关系拓扑不存在");
  return topology;
}

function fieldByName(dataset, fieldName) {
  const field = (dataset.fields ?? []).find((item) => item.name === fieldName);
  if (!field) throw new SemanticApiError(400, `数据集“${dataset.name}”不存在字段“${fieldName}”`);
  return field;
}

function endpointFor(dataset, fieldName) {
  return {
    datasetId: dataset.id,
    connectionId: dataset.connectionId,
    database: dataset.database,
    table: dataset.table,
    field: fieldName,
  };
}

function measuredValueJson(value) {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function jsonSafeValue(value) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (Array.isArray(value)) return value.map(jsonSafeValue);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafeValue(item)]));
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return value;
}

function persistEvidence(items) {
  return (items ?? []).map((item) => ({
    code: item.code,
    label: item.label,
    weight: item.weight,
    score: item.score,
    detail: item.detail,
    measuredValueJson: measuredValueJson(item.measuredValue),
  }));
}

function relationPairKey(source, target) {
  return [`${source.datasetId}:${source.field}`, `${target.datasetId}:${target.field}`].sort().join("<->");
}

function mergeMetadataFields(existingFields, detectedFields) {
  const existingByName = new Map((existingFields ?? []).map((field) => [field.name, field]));
  return detectedFields.map((field) => {
    const existing = existingByName.get(field.name);
    return existing ? {
      ...field,
      businessName: existing.businessName,
      customComment: existing.customComment,
      semanticConceptId: existing.semanticConceptId,
      enabled: existing.enabled,
      sensitive: existing.sensitive,
    } : field;
  });
}

function relationFromCandidate(candidate, origin, description = "", model = {}) {
  const timestamp = now();
  return {
    id: randomUUID(),
    source: candidate.source,
    target: candidate.target,
    cardinality: candidate.cardinality,
    origin,
    status: "candidate",
    confidence: candidate.confidence,
    ruleVersion: candidate.ruleVersion || RELATION_RULE_VERSION,
    modelProvider: model.provider || "",
    modelName: model.model || "",
    modelPromptVersion: model.promptVersion || "",
    businessDescription: description || candidate.evidence?.map((item) => item.detail).filter(Boolean).slice(0, 2).join("；") || "规则引擎识别候选",
    hardBlocks: candidate.hardBlocks ?? [],
    evidence: persistEvidence(candidate.evidence),
    createdAt: timestamp,
    updatedAt: timestamp,
    confirmedAt: "",
    confirmedBy: "",
  };
}

function upsertCandidates(config, topology, candidates, origin, model) {
  const relations = [...config.relations];
  const relationIds = new Set(topology.relationIds ?? []);
  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  const output = [];
  for (const item of candidates) {
    const description = item.businessDescription ?? "";
    const candidate = item.candidate ?? item;
	const effectiveOrigin = candidate.explicitForeignKey === true ? "database" : origin;
    const key = relationPairKey(candidate.source, candidate.target);
    const existing = relations.find((relation) => relationPairKey(relation.source, relation.target) === key);
    if (existing) {
      relationIds.add(existing.id);
      if (existing.status === "candidate") {
		const next = relationFromCandidate(candidate, effectiveOrigin, description, model);
        Object.assign(existing, {
          ...next,
          id: existing.id,
          createdAt: existing.createdAt,
        });
        refreshed += 1;
      } else {
        skipped += 1;
      }
      output.push(existing);
      continue;
    }
    if (relations.length >= MAX_RELATIONS) throw new SemanticApiError(409, `关系资产已达到${MAX_RELATIONS}条上限`);
	const relation = relationFromCandidate(candidate, effectiveOrigin, description, model);
    relations.push(relation);
    relationIds.add(relation.id);
    output.push(relation);
    created += 1;
  }
  const topologies = config.topologies.map((item) => item.id === topology.id ? { ...item, relationIds: [...relationIds], updatedAt: now() } : item);
  return { relations, topologies, output, summary: { created, refreshed, skipped } };
}

function resolveCandidateEndpoints(config, item) {
  const sourceDataset = datasetById(config, item.source.datasetId);
  const targetDataset = datasetById(config, item.target.datasetId);
  const sourceField = fieldByName(sourceDataset, item.source.field);
  const targetField = fieldByName(targetDataset, item.target.field);
  return { sourceDataset, targetDataset, sourceField, targetField };
}

function collectLlmTextFinishError(finish) {
  if (!finish) return new Error("模型流未正常结束，本批结果未写入，请重试");
  if (finish.kind === "stop") return undefined;
  if (finish.kind === "error" || finish.kind === "aborted") return new Error(finish.failure?.message ?? "大模型调用失败");
  if (finish.kind === "max-tokens") return new Error("大模型输出达到上限，请缩小拓扑范围后重试");
  if (finish.kind === "tool-calls") return new Error("关系识别模型不应调用工具");
  return new Error(`不支持的大模型结束状态：${String(finish.kind)}`);
}

/** 创建序列化写入、数据库元数据和模型识别运行时。 */
export function createSemanticRuntime(scope, sctx) {
  const queryStore = createDatasetQueryStore({
    getSource: (id) => {
      const config = configView(scope.get()), dataset = datasetById(config, id);
      return { dataset, connection: connectionById(config, dataset.connectionId) };
    },
    streamRows: streamDatasetRows,
  });
  let writeQueue = Promise.resolve();

  async function commit(mutator) {
    let result;
    const operation = writeQueue.then(async () => {
      const current = configView(scope.get());
      const mutation = await mutator(current);
      const next = {
        ...current,
        ...mutation.patch,
        semanticSchemaVersion: 1,
        semanticVersion: current.semanticVersion + 1,
      };
      await scope.replace(next);
      result = { ...mutation.result, semanticVersion: next.semanticVersion };
    });
    writeQueue = operation.catch(() => undefined);
    await operation;
    return result;
  }

  async function inspectDataset(input, signal) {
    const config = configView(scope.get());
    const connectionId = nonEmptyString(input.connectionId, "数据库连接");
    const database = nonEmptyString(input.database, "数据库名称", 128);
    const table = nonEmptyString(input.table, "数据表名称", 128);
    const connection = connectionById(config, connectionId);
    return inspectTableMetadata(connection, database, table, signal);
  }

  async function saveDataset(input, signal) {
    return commit(async (config) => {
      const id = typeof input.id === "string" ? input.id : "";
      const existing = config.datasets.find((dataset) => dataset.id === id);
      const connectionId = nonEmptyString(input.connectionId ?? existing?.connectionId, "数据库连接");
      const database = nonEmptyString(input.database ?? existing?.database, "数据库名称", 128);
      const table = nonEmptyString(input.table ?? existing?.table, "数据表名称", 128);
      const connection = connectionById(config, connectionId);
      const metadata = await inspectTableMetadata(connection, database, table, signal);
      if (metadata.fields.length > MAX_FIELDS_PER_DATASET) throw new SemanticApiError(409, `单个数据集最多支持${MAX_FIELDS_PER_DATASET}个字段`);
      if (!existing && config.datasets.length >= MAX_DATASETS) throw new SemanticApiError(409, `数据集已达到${MAX_DATASETS}个上限`);
      const timestamp = now();
      const requestedFields = Array.isArray(input.fields) ? input.fields : existing?.fields;
      const customByName = new Map((requestedFields ?? []).map((field) => [field.name, field]));
      const mergedFields = mergeMetadataFields(existing?.fields, metadata.fields).map((field) => {
        const custom = customByName.get(field.name);
        if (!custom) return field;
        return {
          ...field,
          businessName: optionalString(custom.businessName, 200),
          customComment: optionalString(custom.customComment, 5000),
          semanticConceptId: typeof custom.semanticConceptId === "string" ? custom.semanticConceptId : "",
          enabled: custom.enabled !== false,
          sensitive: custom.sensitive === true,
        };
      });
      const dataset = {
        id: existing?.id ?? randomUUID(),
        name: nonEmptyString(input.name ?? existing?.name, "数据集名称", 200),
        connectionId,
        database,
        table,
        tableComment: metadata.tableComment,
        purpose: optionalString(input.purpose ?? existing?.purpose, 5000),
        enabled: input.enabled !== false,
        metadataVersion: metadata.metadataVersion,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        fields: mergedFields,
      };
      const datasets = existing
        ? config.datasets.map((item) => item.id === existing.id ? dataset : item)
        : [...config.datasets, dataset];
      return {
        patch: {
          datasets,
          auditLog: audit(config, existing ? "dataset.update" : "dataset.create", "dataset", dataset.id, `${dataset.name}｜${database}.${table}`),
        },
        result: { dataset },
      };
    });
  }

  async function syncDataset(datasetId, signal) {
    const current = configView(scope.get());
    const dataset = datasetById(current, datasetId);
    return saveDataset(dataset, signal);
  }

  async function deleteDataset(datasetId, cascade) {
    return commit(async (config) => {
      const dataset = datasetById(config, datasetId);
      const relationIds = config.relations.filter((relation) => relation.source.datasetId === datasetId || relation.target.datasetId === datasetId).map((relation) => relation.id);
      const topologyIds = config.topologies.filter((topology) => topology.datasetIds.includes(datasetId)).map((topology) => topology.id);
      if ((relationIds.length > 0 || topologyIds.length > 0) && cascade !== true) {
        throw new SemanticApiError(409, `数据集仍被${relationIds.length}条关系和${topologyIds.length}个拓扑引用；确认级联删除后再操作`);
      }
      const relationSet = new Set(relationIds);
      return {
        patch: {
          datasets: config.datasets.filter((item) => item.id !== datasetId),
          relations: config.relations.filter((relation) => !relationSet.has(relation.id)),
          topologies: config.topologies.map((topology) => ({
            ...topology,
            datasetIds: topology.datasetIds.filter((id) => id !== datasetId),
            relationIds: topology.relationIds.filter((id) => !relationSet.has(id)),
          })),
          auditLog: audit(config, "dataset.delete", "dataset", datasetId, `删除数据集“${dataset.name}”并清理引用`),
        },
        result: { deleted: datasetId, cascadedRelations: relationIds.length, updatedTopologies: topologyIds.length },
      };
    });
  }

  async function saveConcept(input) {
    return commit(async (config) => {
      const existing = typeof input.id === "string" ? config.semanticConcepts.find((item) => item.id === input.id) : undefined;
      if (!existing && config.semanticConcepts.length >= MAX_CONCEPTS) throw new SemanticApiError(409, `统一语义概念已达到${MAX_CONCEPTS}个上限`);
      const timestamp = now();
      const concept = {
        id: existing?.id ?? randomUUID(),
        name: nonEmptyString(input.name ?? existing?.name, "概念名称", 200),
        definition: optionalString(input.definition ?? existing?.definition, 5000),
        aliases: uniqueStrings(input.aliases ?? existing?.aliases, 100),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      if (config.semanticConcepts.some((item) => item.id !== concept.id && item.name.toLowerCase() === concept.name.toLowerCase())) {
        throw new SemanticApiError(409, "已存在同名统一语义概念");
      }
      const semanticConcepts = existing
        ? config.semanticConcepts.map((item) => item.id === concept.id ? concept : item)
        : [...config.semanticConcepts, concept];
      return {
        patch: { semanticConcepts, auditLog: audit(config, existing ? "concept.update" : "concept.create", "concept", concept.id, concept.name) },
        result: { concept },
      };
    });
  }

  async function deleteConcept(conceptId) {
    return commit(async (config) => {
      const concept = config.semanticConcepts.find((item) => item.id === conceptId);
      if (!concept) throw new SemanticApiError(404, "统一语义概念不存在");
      const datasets = config.datasets.map((dataset) => ({
        ...dataset,
        fields: dataset.fields.map((field) => field.semanticConceptId === conceptId ? { ...field, semanticConceptId: "" } : field),
      }));
      return {
        patch: {
          datasets,
          semanticConcepts: config.semanticConcepts.filter((item) => item.id !== conceptId),
          auditLog: audit(config, "concept.delete", "concept", conceptId, `删除概念“${concept.name}”并解除字段绑定`),
        },
        result: { deleted: conceptId },
      };
    });
  }

  async function saveTopology(input) {
    return commit(async (config) => {
      const existing = typeof input.id === "string" ? config.topologies.find((item) => item.id === input.id) : undefined;
      if (!existing && config.topologies.length >= MAX_TOPOLOGIES) throw new SemanticApiError(409, `关系拓扑已达到${MAX_TOPOLOGIES}个上限`);
      const datasetIds = uniqueStrings(input.datasetIds ?? existing?.datasetIds, MAX_DATASETS);
      for (const id of datasetIds) datasetById(config, id);
      const validRelationIds = new Set(config.relations.map((relation) => relation.id));
      const relationIds = uniqueStrings(input.relationIds ?? existing?.relationIds, MAX_RELATIONS).filter((id) => validRelationIds.has(id));
      const timestamp = now();
      const topology = {
        id: existing?.id ?? randomUUID(),
        name: nonEmptyString(input.name ?? existing?.name, "拓扑名称", 200),
        purpose: optionalString(input.purpose ?? existing?.purpose, 5000),
        enabled: input.enabled !== false,
        datasetIds,
        relationIds,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      const topologies = existing
        ? config.topologies.map((item) => item.id === topology.id ? topology : item)
        : [...config.topologies, topology];
      return {
        patch: { topologies, auditLog: audit(config, existing ? "topology.update" : "topology.create", "topology", topology.id, topology.name) },
        result: { topology },
      };
    });
  }

  async function deleteTopology(topologyId) {
    return commit(async (config) => {
      const topology = topologyById(config, topologyId);
      return {
        patch: {
          topologies: config.topologies.filter((item) => item.id !== topologyId),
          auditLog: audit(config, "topology.delete", "topology", topologyId, `删除拓扑“${topology.name}”，共享关系资产保留`),
        },
        result: { deleted: topologyId },
      };
    });
  }

  function validateRelationInput(config, input) {
    if (typeof input.source !== "object" || typeof input.target !== "object") throw new SemanticApiError(400, "关系必须提供来源和目标字段");
    const sourceDataset = datasetById(config, input.source.datasetId);
    const targetDataset = datasetById(config, input.target.datasetId);
    const sourceField = fieldByName(sourceDataset, input.source.field);
    const targetField = fieldByName(targetDataset, input.target.field);
    if (sourceDataset.id === targetDataset.id && sourceField.name === targetField.name) throw new SemanticApiError(400, "关系两端不能是同一字段");
    const compatibility = typeCompatibility(sourceField.dataType, targetField.dataType);
    if (!compatibility.compatible) throw new SemanticApiError(409, `字段类型不兼容：${compatibility.detail}`);
    const cardinalities = new Set(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]);
    const cardinality = cardinalities.has(input.cardinality) ? input.cardinality : "many-to-one";
    return {
      sourceDataset,
      targetDataset,
      sourceField,
      targetField,
      source: endpointFor(sourceDataset, sourceField.name),
      target: endpointFor(targetDataset, targetField.name),
      cardinality,
    };
  }

  async function saveRelation(input) {
    return commit(async (config) => {
      const existing = typeof input.id === "string" ? config.relations.find((item) => item.id === input.id) : undefined;
      if (!existing && config.relations.length >= MAX_RELATIONS) throw new SemanticApiError(409, `关系资产已达到${MAX_RELATIONS}条上限`);
      const valid = validateRelationInput(config, input);
      const timestamp = now();
      const status = input.status === "confirmed" || input.status === "rejected" ? input.status : "candidate";
      const description = optionalString(input.businessDescription ?? existing?.businessDescription, 5000);
      if (status === "confirmed" && description.length === 0) throw new SemanticApiError(400, "人工确认关系前必须填写关系依据与业务说明");
      const relation = {
        id: existing?.id ?? randomUUID(),
        source: valid.source,
        target: valid.target,
        cardinality: valid.cardinality,
        origin: existing?.origin ?? "manual",
        status,
        confidence: existing?.confidence ?? 100,
        ruleVersion: existing?.ruleVersion ?? RELATION_RULE_VERSION,
        modelProvider: existing?.modelProvider ?? "",
        modelName: existing?.modelName ?? "",
        modelPromptVersion: existing?.modelPromptVersion ?? "",
        businessDescription: description,
        hardBlocks: [],
        evidence: existing?.evidence ?? [],
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        confirmedAt: status === "confirmed" ? timestamp : "",
        confirmedBy: status === "confirmed" ? "manual" : "",
      };
      const duplicate = config.relations.find((item) => item.id !== relation.id && relationPairKey(item.source, item.target) === relationPairKey(relation.source, relation.target));
      if (duplicate) throw new SemanticApiError(409, "该字段关系已存在，请编辑已有关系");
      const relations = existing
        ? config.relations.map((item) => item.id === relation.id ? relation : item)
        : [...config.relations, relation];
      let topologies = config.topologies;
      if (typeof input.topologyId === "string" && input.topologyId.length > 0) {
        const topology = topologyById(config, input.topologyId);
        if (!topology.datasetIds.includes(valid.sourceDataset.id) || !topology.datasetIds.includes(valid.targetDataset.id)) {
          throw new SemanticApiError(409, "关系两端数据集必须先加入当前拓扑");
        }
        topologies = config.topologies.map((item) => item.id === topology.id ? { ...item, relationIds: [...new Set([...item.relationIds, relation.id])], updatedAt: timestamp } : item);
      }
      return {
        patch: { relations, topologies, auditLog: audit(config, existing ? "relation.update" : "relation.create", "relation", relation.id, description || relationPairKey(relation.source, relation.target)) },
        result: { relation },
      };
    });
  }

  async function setRelationStatus(relationId, status) {
    return commit(async (config) => {
      const relation = config.relations.find((item) => item.id === relationId);
      if (!relation) throw new SemanticApiError(404, "关系不存在");
      if (status === "confirmed" && relation.hardBlocks.length > 0) throw new SemanticApiError(409, `该候选存在硬阻断：${relation.hardBlocks.join("；")}。请先编辑关系端点或类型。`);
      if (status === "confirmed" && relation.businessDescription.trim().length === 0) throw new SemanticApiError(400, "确认关系前必须补充关系依据与业务说明");
      const timestamp = now();
      const next = {
        ...relation,
        status,
        updatedAt: timestamp,
        confirmedAt: status === "confirmed" ? timestamp : "",
        confirmedBy: status === "confirmed" ? "manual" : "",
      };
      return {
        patch: {
          relations: config.relations.map((item) => item.id === relationId ? next : item),
          auditLog: audit(config, `relation.${status}`, "relation", relationId, next.businessDescription || relationPairKey(next.source, next.target)),
        },
        result: { relation: next },
      };
    });
  }

  async function deleteRelation(relationId) {
    return commit(async (config) => {
      const relation = config.relations.find((item) => item.id === relationId);
      if (!relation) throw new SemanticApiError(404, "关系不存在");
      return {
        patch: {
          relations: config.relations.filter((item) => item.id !== relationId),
          topologies: config.topologies.map((topology) => ({ ...topology, relationIds: topology.relationIds.filter((id) => id !== relationId) })),
          auditLog: audit(config, "relation.delete", "relation", relationId, relationPairKey(relation.source, relation.target)),
        },
        result: { deleted: relationId },
      };
    });
  }

  async function sampleCandidate(config, candidate, signal) {
    const endpoints = resolveCandidateEndpoints(config, candidate);
    const sourceConnection = connectionById(config, endpoints.sourceDataset.connectionId);
    const targetConnection = connectionById(config, endpoints.targetDataset.connectionId);
    const metrics = await compareDistinctValues(
      sourceConnection,
      endpoints.sourceDataset,
      endpoints.sourceField.name,
      targetConnection,
      endpoints.targetDataset,
      endpoints.targetField.name,
      signal,
    );
    return scoreRelationPair({ ...endpoints, sampleMetrics: metrics });
  }

  async function ruleCandidates(topologyId, sampleValues, signal) {
    const config = configView(scope.get());
    const topology = topologyById(config, topologyId);
    let candidates = generateRuleCandidates(config.datasets, topology, { includeBlocked: true, limit: 200 });
    if (sampleValues === true) {
      const selected = candidates.filter((candidate) => candidate.hardBlocks.length === 0).slice(0, MAX_SAMPLE_CANDIDATES);
      const rescored = [];
      for (const candidate of selected) {
        signal?.throwIfAborted?.();
        try {
          const next = await sampleCandidate(config, candidate, signal);
          rescored.push({ ...next, pairKey: candidate.pairKey });
        } catch (error) {
          rescored.push({ ...candidate, sampleWarning: error instanceof Error ? error.message : String(error) });
        }
      }
      const rescoredByKey = new Map(rescored.map((candidate) => [candidate.pairKey, candidate]));
      candidates = candidates.map((candidate) => rescoredByKey.get(candidate.pairKey) ?? candidate)
        .filter((candidate) => candidate.confidence >= RELATION_THRESHOLDS.low)
        .sort((left, right) => right.confidence - left.confidence);
    }
    return { config, topology, candidates };
  }

  async function identifyByRules(topologyId, sampleValues, signal) {
    const analyzed = await ruleCandidates(topologyId, sampleValues, signal);
    const persistable = analyzed.candidates.filter((candidate) => candidate.eligible);
    return commit(async (latest) => {
      const topology = topologyById(latest, topologyId);
      const upserted = upsertCandidates(latest, topology, persistable, "rule");
      return {
        patch: {
          relations: upserted.relations,
          topologies: upserted.topologies,
          auditLog: audit(latest, "relation.identify.rules", "topology", topologyId, `规则引擎生成或刷新${persistable.length}条候选`),
        },
        result: { candidates: upserted.output, blocked: analyzed.candidates.filter((candidate) => !candidate.eligible), summary: upserted.summary },
      };
    });
  }

  async function listModels() {
    const llm = sctx.get("llm");
    if (!llm) return { available: false, providers: [], error: "当前 Harness 未提供 llm（大模型）服务；规则引擎仍可使用" };
    const providers = llm.listProviders();
    const result = [];
    for (const provider of providers) {
      try {
        result.push({ ...provider, models: await llm.listModels(provider.id) });
      } catch (error) {
        result.push({ ...provider, models: [], error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { available: true, providers: result };
  }

  async function saveModelConfig(input) {
    const provider = typeof input.provider === "string" ? input.provider.trim() : "";
    const model = typeof input.model === "string" ? input.model.trim() : "";
    if ((provider.length === 0) !== (model.length === 0)) throw new SemanticApiError(400, "provider（模型服务）和 model（模型）必须同时填写或同时留空");
    const maxTokens = Number.isInteger(input.maxTokens) ? Math.min(Math.max(input.maxTokens, 256), 8192) : 2048;
    const timeoutMs = Number.isInteger(input.timeoutMs) ? Math.min(Math.max(input.timeoutMs, 5000), 120000) : 60000;
    return commit(async (config) => ({
      patch: { modelConfig: { provider, model, maxTokens, timeoutMs }, auditLog: audit(config, "model.config", "model", provider || "none", provider ? `${provider}/${model}` : "清空模型选择") },
      result: { modelConfig: { provider, model, maxTokens, timeoutMs } },
    }));
  }

  async function identifyByLlm(topologyId, options = {}, signal) {
    signal?.throwIfAborted?.();
    const config = configView(scope.get());
    const plan = relationBatchPlan(config, topologyId, { ...options, limit: 1 });
    if (options.planVersion && options.planVersion !== plan.version) throw new SemanticApiError(409, "数据结构或语义已更新，请重新规划识别批次");
    if (plan.totalBatches !== 1 && (!options.planVersion || !Number.isInteger(options.batchIndex))) throw new SemanticApiError(400, "请先查看分批计划并选择批次；不会默认截取整个拓扑的一部分");
    const batch = plan.at(options.batchIndex ?? 0);
    if (!batch.fits) throw new SemanticApiError(400, "该批次超过输入预算；请调整过长的业务说明或提高单批预算，不会截断字段说明");
    const analyzed = { config, topology: topologyById(config, topologyId), candidates: batch.candidates };
    const llm = sctx.get("llm");
    if (!llm) throw new SemanticApiError(503, "当前 Harness 未提供 llm（大模型）服务，请使用规则引擎或检查宿主配置");
    const provider = optionalString(options.provider || analyzed.config.modelConfig.provider, 200);
    const model = optionalString(options.model || analyzed.config.modelConfig.model, 300);
    if (!provider || !model) throw new SemanticApiError(400, "请先选择真实可用的模型服务和模型");
    const prompt = batch.prompt;
    if (llm.resolveModelInfo) {
      const info = await llm.resolveModelInfo(provider, model, signal);
      const window = info?.context?.contextWindow;
      if (window && batch.estimatedTokens + (config.modelConfig.maxTokens || 2048) + Math.max(2048, Math.ceil(window * 0.05)) > window) throw new SemanticApiError(400, "该模型的窗口不足以容纳本批输入与输出；请降低单批输入预算重新规划");
    }
    const timeoutMs = analyzed.config.modelConfig.timeoutMs || 60000;
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason ?? new Error("大模型关系识别已取消"));
    signal?.addEventListener?.("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(new Error("大模型关系识别超时")), timeoutMs);
    let text = "";
    let finish;
    try {
      const messages = [{
        role: "user",
        content: [{ type: "text", text: prompt.user }],
        source: { kind: "plugin", plugin: "@deepseek-ai/dsh-database-connections" },
      }];
      for await (const chunk of llm.stream({
        provider,
        model,
        messages,
        system: prompt.system,
        temperature: 0,
        maxTokens: analyzed.config.modelConfig.maxTokens || 2048,
        signal: controller.signal,
      })) {
        controller.signal.throwIfAborted();
        if (chunk.type === "text-delta") { text += chunk.text; if (text.length > 200000) throw new SemanticApiError(502, "模型返回过长，已停止本批识别"); }
        if (chunk.type === "finish") finish = chunk.reason;
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener?.("abort", abort);
    }
    const finishError = collectLlmTextFinishError(finish);
    if (finishError) throw new SemanticApiError(502, finishError.message);
    const modelItems = parseRelationModelOutput(text, prompt.allowedEndpoints);
    const accepted = [];
    const rejected = [];
    for (const item of modelItems) {
      if (item.decision === "reject") {
        rejected.push(item);
        continue;
      }
      const endpoints = resolveCandidateEndpoints(analyzed.config, item);
      let candidate = scoreRelationPair(endpoints);
      if (options.sampleValues === true && accepted.length < MAX_SAMPLE_CANDIDATES) {
        try {
          candidate = await sampleCandidate(analyzed.config, { source: endpointFor(endpoints.sourceDataset, endpoints.sourceField.name), target: endpointFor(endpoints.targetDataset, endpoints.targetField.name) }, signal);
        } catch (error) {
          candidate = { ...candidate, sampleWarning: error instanceof Error ? error.message : String(error) };
        }
      }
      candidate = { ...candidate, pairKey: item.pairKey };
      if (candidate.cardinality !== item.cardinality) {
        rejected.push({ ...item, reason: `${item.reason}；模型关联基数与键结构复核不一致，需人工维护` });
        continue;
      }
      if (!candidate.eligible) {
        rejected.push({ ...item, deterministicScore: candidate.confidence, hardBlocks: candidate.hardBlocks, reason: `${item.reason}；确定性复核未通过` });
        continue;
      }
      accepted.push({ candidate, businessDescription: item.reason });
    }
    return commit(async (latest) => {
      if (relationBatchPlan(latest, topologyId, { ...options, limit: 1 }).version !== plan.version) throw new SemanticApiError(409, "识别期间语义资料已更新，本批结果未写入，请重新规划");
      const topology = topologyById(latest, topologyId);
      const upserted = upsertCandidates(latest, topology, accepted, "llm", { provider, model, promptVersion: LLM_RELATION_PROMPT_VERSION });
      return {
        patch: {
          relations: upserted.relations,
          topologies: upserted.topologies,
          auditLog: audit(latest, "relation.identify.llm", "topology", topologyId, `大模型返回${modelItems.length}条，确定性复核通过${accepted.length}条`),
        },
        result: { candidates: upserted.output, rejected, batch: { index: batch.index, total: plan.totalBatches, planVersion: plan.version, nextIndex: batch.index + 1 < plan.totalBatches ? batch.index + 1 : null }, summary: { ...upserted.summary, modelReturned: modelItems.length, deterministicAccepted: accepted.length } },
      };
    });
  }

  async function queryDataset(datasetId, request, signal) {
    return queryStore.query(datasetId, request, { signal });
  }

  async function boundedQueryDataset(args, execution) {
    const owner = execution?.agent?.session?.id || 'local';
    if (args.action === 'close') return queryStore.query(args.datasetId, args, { signal: execution?.signal, owner });
    const budget = await resolveContextBudget(sctx, args.maxTokens, execution);
    if (budget.limit < 1024) return { status: 'budget_exceeded', complete: false, rows: [], nextCursor: args.cursor || null,
      nextAction: '当前对话剩余空间不足。保留查询游标，整理当前结果释放上下文后继续；不能宣称已读取全部数据。' };
    return reserveResponse(budget, await queryStore.query(args.datasetId, args, {
      signal: execution?.signal, owner, tokenBudget: budget.limit,
    }));
  }

  async function deleteConnectionGuard(connectionId) {
    const config = configView(scope.get());
    const count = config.datasets.filter((dataset) => dataset.connectionId === connectionId).length;
    if (count > 0) throw new SemanticApiError(409, `该连接仍被${count}个数据集使用，请先迁移或删除这些数据集`);
  }

  return {
    version: "1.2.0",
    dispose: queryStore.dispose,
    boundedQueryDataset,
    searchDatasetCatalog: (options) => searchDatasetCatalog(configView(scope.get()), options),
    searchDatasetFields: (options) => searchDatasetFields(configView(scope.get()), options),
    prepareTaskContext: async (options = {}, execution) => {
      const budget = await resolveContextBudget(sctx, options.maxTokens, execution);
      return reserveResponse(budget, prepareTaskContext(configView(scope.get()), options, budget));
    },
    boundedCatalog: async (options = {}, execution) => {
      const budget = await resolveContextBudget(sctx, options.maxTokens, execution);
      return reserveResponse(budget, fitContext({ status: "ok", ...searchDatasetCatalog(configView(scope.get()), options) }, budget));
    },
    boundedFields: async (options = {}, execution) => {
      const budget = await resolveContextBudget(sctx, options.maxTokens, execution);
      return reserveResponse(budget, fitContext({ status: "ok", ...searchDatasetFields(configView(scope.get()), options) }, budget));
    },
    planRelationBatches: (topologyId, options) => { const { at, ...plan } = relationBatchPlan(configView(scope.get()), topologyId, options); return plan; },
    getState: () => publicState(scope.get()),
    getAudit: () => configView(scope.get()).auditLog,
    getRuleDefinition,
    inspectDataset,
    saveDataset,
    syncDataset,
    deleteDataset,
    saveConcept,
    deleteConcept,
    saveTopology,
    deleteTopology,
    saveRelation,
    confirmRelation: (id) => setRelationStatus(id, "confirmed"),
    rejectRelation: (id) => setRelationStatus(id, "rejected"),
    deleteRelation,
    identifyByRules,
    identifyByLlm,
    listModels,
    saveModelConfig,
    getSnapshot: (options) => buildSemanticSnapshot(configView(scope.get()), options),
    getDatasetContext: (id) => getDatasetContext(configView(scope.get()), id),
    getTopologyContext: (id) => getTopologyContext(configView(scope.get()), id),
    findJoinPath: (from, to, topologyId) => findConfirmedJoinPath(configView(scope.get()), from, to, topologyId),
    queryDataset,
    deleteConnectionGuard,
  };
}
