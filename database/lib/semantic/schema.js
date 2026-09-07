import z from "@deepseek-ai/schemastery";

export const FieldReferenceSchema = z.object({
  database: z.string(),
  table: z.string(),
  field: z.string(),
  constraintName: z.string(),
});

export const DatasetFieldSchema = z.object({
  name: z.string().min(1),
  ordinal: z.number().step(1).min(1),
  dataType: z.string().min(1),
  nullable: z.boolean(),
  defaultValue: z.string(),
  databaseComment: z.string(),
  businessName: z.string(),
  customComment: z.string(),
  semanticConceptId: z.string(),
  enabled: z.boolean(),
  sensitive: z.boolean(),
  primaryKey: z.boolean(),
  unique: z.boolean(),
  indexed: z.boolean(),
  references: z.array(FieldReferenceSchema).default([]),
});

export const DatasetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  connectionId: z.string().min(1),
  database: z.string().min(1),
  table: z.string().min(1),
  tableComment: z.string(),
  purpose: z.string(),
  enabled: z.boolean(),
  metadataVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  fields: z.array(DatasetFieldSchema).default([]),
});

export const SemanticConceptSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  definition: z.string(),
  aliases: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RelationEndpointSchema = z.object({
  datasetId: z.string().min(1),
  connectionId: z.string(),
  database: z.string(),
  table: z.string(),
  field: z.string().min(1),
});

export const RelationEvidenceSchema = z.object({
  code: z.string().min(1),
  label: z.string(),
  weight: z.number().min(0).max(100),
  score: z.number().min(0).max(100),
  detail: z.string(),
  measuredValueJson: z.string(),
});

export const RelationSchema = z.object({
  id: z.string().min(1),
  source: RelationEndpointSchema,
  target: RelationEndpointSchema,
  cardinality: z.union([
    z.const("one-to-one"),
    z.const("one-to-many"),
    z.const("many-to-one"),
    z.const("many-to-many"),
  ]),
  origin: z.union([z.const("database"), z.const("rule"), z.const("llm"), z.const("manual")]),
  status: z.union([z.const("candidate"), z.const("confirmed"), z.const("rejected")]),
  confidence: z.number().min(0).max(100),
  ruleVersion: z.string(),
  modelProvider: z.string(),
  modelName: z.string(),
  modelPromptVersion: z.string(),
  businessDescription: z.string(),
  hardBlocks: z.array(z.string()).default([]),
  evidence: z.array(RelationEvidenceSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  confirmedAt: z.string(),
  confirmedBy: z.string(),
});

export const TopologySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string(),
  enabled: z.boolean(),
  datasetIds: z.array(z.string()).default([]),
  relationIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ModelConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  maxTokens: z.number().step(1).min(256).max(8192),
  timeoutMs: z.number().step(1).min(5000).max(120000),
}).default({
  provider: "",
  model: "",
  maxTokens: 2048,
  timeoutMs: 60000,
});

export const AuditEntrySchema = z.object({
  id: z.string().min(1),
  at: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  summary: z.string(),
});

/** 可直接展开到原连接 ConfigSchema 中，旧配置缺字段时使用默认值。 */
export const semanticConfigFields = {
  semanticSchemaVersion: z.number().step(1).min(1).default(1),
  semanticVersion: z.number().step(1).min(1).default(1),
  datasets: z.array(DatasetSchema).default([]),
  semanticConcepts: z.array(SemanticConceptSchema).default([]),
  relations: z.array(RelationSchema).default([]),
  topologies: z.array(TopologySchema).default([]),
  modelConfig: ModelConfigSchema,
  auditLog: z.array(AuditEntrySchema).default([]),
};

export function normalizedSemanticConfig(value) {
  return {
    semanticSchemaVersion: Number.isInteger(value.semanticSchemaVersion) ? value.semanticSchemaVersion : 1,
    semanticVersion: Number.isInteger(value.semanticVersion) ? value.semanticVersion : 1,
    datasets: Array.isArray(value.datasets) ? value.datasets : [],
    semanticConcepts: Array.isArray(value.semanticConcepts) ? value.semanticConcepts : [],
    relations: Array.isArray(value.relations) ? value.relations : [],
    topologies: Array.isArray(value.topologies) ? value.topologies : [],
    modelConfig: value.modelConfig && typeof value.modelConfig === "object" ? value.modelConfig : { provider: "", model: "", maxTokens: 2048, timeoutMs: 60000 },
    auditLog: Array.isArray(value.auditLog) ? value.auditLog : [],
  };
}
