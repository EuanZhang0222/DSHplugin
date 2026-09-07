/** DeepSeek Harness 数据库统一语义层插件 2.0 类型定义。 */
import type { Context } from '@deepseek-ai/cordis';

/** DatabaseKind（数据库类型）。 */
export type DatabaseKind = 'mysql' | 'clickhouse';

/** DatabaseConnection（宿主端持久化连接，用户名和密码均属于凭据）。 */
export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseKind;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/** DatabaseConnectionView（前端脱敏连接视图，不返回用户名和密码）。 */
export interface DatabaseConnectionView {
  id: string;
  name: string;
  type: DatabaseKind;
  host: string;
  port: number;
  database: string;
  hasUsername: boolean;
  hasPassword: boolean;
}

/** DatasetField（数据集字段定义）。 */
export interface DatasetField {
  name: string;
  ordinal: number;
  dataType: string;
  nullable: boolean;
  defaultValue: string;
  databaseComment: string;
  businessName: string;
  customComment: string;
  semanticConceptId: string;
  enabled: boolean;
  sensitive: boolean;
  primaryKey: boolean;
  unique: boolean;
  indexed: boolean;
  references: Array<{ database: string; table: string; field: string; constraintName: string }>;
}

/** DatabaseDataset（数据库数据集）。 */
export interface DatabaseDataset {
  id: string;
  name: string;
  connectionId: string;
  database: string;
  table: string;
  tableComment: string;
  purpose: string;
  enabled: boolean;
  metadataVersion: string;
  createdAt: string;
  updatedAt: string;
  fields: DatasetField[];
}

/** SemanticConcept（统一语义概念）。 */
export interface SemanticConcept {
  id: string;
  name: string;
  definition: string;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
}

/** RelationCardinality（关系基数）。 */
export type RelationCardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
/** RelationStatus（关系状态）。 */
export type RelationStatus = 'candidate' | 'confirmed' | 'rejected';
/** RelationOrigin（关系来源）。 */
export type RelationOrigin = 'database' | 'rule' | 'llm' | 'manual';

export interface RelationEndpoint {
  datasetId: string;
  connectionId: string;
  database: string;
  table: string;
  field: string;
}

export interface RelationEvidence {
  code: string;
  label: string;
  weight: number;
  score: number;
  detail: string;
  measuredValueJson: string;
}

/** DatasetRelation（数据集字段关系）。 */
export interface DatasetRelation {
  id: string;
  source: RelationEndpoint;
  target: RelationEndpoint;
  cardinality: RelationCardinality;
  origin: RelationOrigin;
  status: RelationStatus;
  confidence: number;
  ruleVersion: string;
  modelProvider: string;
  modelName: string;
  modelPromptVersion: string;
  businessDescription: string;
  hardBlocks: string[];
  evidence: RelationEvidence[];
  createdAt: string;
  updatedAt: string;
  confirmedAt: string;
  confirmedBy: string;
}

/** DatabaseTopology（数据库关系拓扑）。 */
export interface DatabaseTopology {
  id: string;
  name: string;
  purpose: string;
  enabled: boolean;
  datasetIds: string[];
  relationIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  provider: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
}

/** Config（settings 持久化配置）。 */
export interface Config {
  connections: DatabaseConnection[];
  semanticSchemaVersion: number;
  semanticVersion: number;
  datasets: DatabaseDataset[];
  semanticConcepts: SemanticConcept[];
  relations: DatasetRelation[];
  topologies: DatabaseTopology[];
  modelConfig: ModelConfig;
  auditLog: Array<{ id: string; at: string; action: string; entityType: string; entityId: string; summary: string }>;
}

/** DatasetQueryRequest（数据集受控只读查询参数，不接受原始 SQL）。 */
export interface DatasetQueryRequest {
  fields?: string[];
  filters?: Array<{ field: string; operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'is-null' | 'not-null'; value?: unknown }>;
  orderBy?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  limit?: number;
  /** cursor（查询游标）：下一页使用上一页nextCursor，总结果不限200行。 */
  cursor?: string;
  action?: 'page' | 'close';
  maxTokens?: number;
  /** page（页码）：网页固定行数分页/随机跳页；跳页须带当前查询的cursor。模型通常顺序使用nextCursor。 */
  page?: number;
}

/** DatasetQueryPage（固定结果集的一页；必须检查complete，不能将部分数据视为全量）。 */
export interface DatasetQueryPage {
  status: 'collecting' | 'ready' | 'failed' | 'closed' | 'budget_exceeded';
  dataset?: { id: string; name: string; database: string; table: string };
  queryId?: string; columns?: string[]; columnCount?: number; rows: Record<string, unknown>[];
  limit?: number; rowStart?: number; readThrough?: number; capturedRows?: number; totalRows?: number | null;
  cursor?: string; nextCursor: string | null; hasMore?: boolean; complete: boolean;
  pageNumber?: number; pageSize?: number; totalPages?: number | null; pageComplete?: boolean; pageNextCursor?: string | null;
  rowFragment?: { rowNumber: number; offset: number; text: string; complete: boolean; encoding: 'json-text' };
  createdAt?: string; expiresAt?: string; consistency?: 'single-query-result'; error?: string; nextAction?: string;
}

/** DatabaseSemanticLayerService（供其他宿主插件直接调用的只读语义服务）。 */
export interface DatabaseSemanticLayerService {
  readonly version: string;
  listDatasets(options?: { includeFields?: boolean }): unknown[];
  getDatasetContext(datasetId: string): unknown | undefined;
  getTopologyContext(topologyId: string): unknown | undefined;
  findJoinPath(fromDatasetId: string, toDatasetId: string, topologyId?: string): DatasetRelation[] | undefined;
  queryDataset(datasetId: string, request: DatasetQueryRequest, signal?: AbortSignal): Promise<DatasetQueryPage>;
  getSnapshot(options?: { includeFields?: boolean }): unknown;
  /** 分页目录/字段检索；游标绑定语义版本和检索条件，失效需重新检索。 */
  searchDatasetCatalog(options?: SemanticCatalogRequest): SemanticCatalogPage;
  searchDatasetFields(options: SemanticCatalogRequest & { datasetId: string }): SemanticFieldPage;
  /** 默认6000估算Token，上限16000；完整旧接口不变，模型接入优先使用此接口。 */
  prepareTaskContext(options?: TaskSemanticRequest, execution?: { agent?: unknown; signal?: AbortSignal }): Promise<TaskSemanticResult>;
}

export interface SemanticCatalogRequest { keyword?: string; topologyId?: string; limit?: number; cursor?: string; maxTokens?: number }
export interface SemanticSource { connectionId: string; connectionName: string; databaseType: string; database: string; table: string }
export interface SemanticCatalogItem { id: string; name: string; purpose: string; source: SemanticSource; fieldCount: number; matchedFields?: string[] }
export interface SemanticCatalogPage { semanticVersion: number; datasets: SemanticCatalogItem[]; total: number; nextCursor: string | null }
export interface CompactSemanticField { name: string; type: string; label?: string; meaning?: string; conceptId?: string; primaryKey?: boolean; unique?: boolean; nullable?: boolean }
export interface SemanticFieldPage { semanticVersion: number; datasetId: string; fields: CompactSemanticField[]; total: number; nextCursor: string | null }
export interface TaskSemanticRequest {
  question?: string; datasetId?: string; datasetIds?: string[]; topologyId?: string; maxTokens?: number;
  includeFields?: Array<{ datasetId: string; field: string }>;
}
export interface TaskSemanticResult {
  status: 'ok' | 'needs_selection' | 'no_match' | 'budget_exceeded'; semanticVersion: number; nextAction?: string;
  budget: { limit: number; requested?: number; estimated: true; mode: 'standalone' | 'session' | 'fallback'; note?: string; estimatedTokens?: number; requiredEstimate?: number; window?: number; used?: number; outputReserve?: number; safetyReserve?: number; reservedResponses?: number };
  context?: {
    contextVersion: string; semanticVersion: number;
    datasets: Array<SemanticCatalogItem & { fields: CompactSemanticField[]; selectionReason: string; omittedFields: number }>;
    relations: Array<{ id: string; type: RelationCardinality; source: { datasetId: string; field: string }; target: { datasetId: string; field: string }; description: string }>;
    concepts: Array<{ id: string; name: string; definition: string }>;
  };
  selection?: { matchedDatasets: number; omittedDatasets: number; disconnected: string[][]; method: string; nextAction: string };
}

/** 注册 host（宿主）半部：连接、语义层 API、五个 Agent 工具及只读服务。 */
export declare function apply(ctx: Context): void;
