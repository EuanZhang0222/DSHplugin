import { createHash } from "node:crypto";
import { fitContext, inputError, requestedBudget } from "./budget.js";

export const TASK_CONTEXT_VERSION = "database-task-context/1.0.0";
export const visibleField = (field) => field.enabled !== false && field.sensitive !== true;
const normalized = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const uniqueText = (...values) => [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20);

function questionText(value) {
  if (value !== undefined && (typeof value !== "string" || value.length > 1000)) throw inputError("检索问题最多 1000 个字符");
  return normalized(value);
}

function termsFor(query) {
  const terms = new Set(query.match(/[a-z0-9_]+/g) || []);
  const ignored = new Set(["查询", "一下", "哪些", "什么", "如何", "多少", "统计", "按照", "数据", "信息", "相关", "请问", "的总"]);
  for (const run of query.match(/[\p{Script=Han}]+/gu) || []) {
    if (run.length <= 6 && !ignored.has(run)) terms.add(run);
    for (let i = 0; i + 1 < run.length; i++) if (!ignored.has(run.slice(i, i + 2))) terms.add(run.slice(i, i + 2));
  }
  return [...terms];
}

function scoreText(text, query, terms) {
  const value = normalized(text);
  if (!query || !value) return 0;
  let score = value.includes(query) ? 10 : 0;
  for (const term of terms) if (value.includes(term)) score += term.length > 2 ? 3 : 1;
  return score;
}

export function semanticScope(config, topologyId) {
  const topology = topologyId ? (config.topologies || []).find((t) => t.id === topologyId && t.enabled !== false) : undefined;
  if (topologyId && !topology) throw inputError("指定关系拓扑不存在或未启用");
  const ids = topology && new Set(topology.datasetIds || []);
  const connections = new Map((config.connections || []).map((c) => [c.id, c]));
  const datasets = (config.datasets || []).filter((d) => d.enabled !== false && (!ids || ids.has(d.id)) && connections.has(d.connectionId));
  const byId = new Map(datasets.map((d) => [d.id, d]));
  const fieldSets = new Map(datasets.map((d) => [d.id, new Set((d.fields || []).filter(visibleField).map((f) => f.name))]));
  const valid = (ep) => fieldSets.get(ep?.datasetId)?.has(ep.field);
  const relationMap = new Map((config.relations || []).map((r) => [r.id, r]));
  // Only relationships referenced by an enabled topology are published. No orphan or hidden endpoints.
  const allowed = new Set((topology ? [topology] : config.topologies || []).filter((t) => t.enabled !== false).flatMap((t) => {
    const members = new Set(t.datasetIds || []);
    return (t.relationIds || []).filter((id) => { const r = relationMap.get(id); return r && members.has(r.source.datasetId) && members.has(r.target.datasetId); });
  }));
  const relations = (config.relations || []).filter((r) => r.status === "confirmed" && allowed.has(r.id) && valid(r.source) && valid(r.target));
  const concepts = new Map((config.semanticConcepts || []).map((c) => [c.id, c]));
  return { datasets, byId, relations, concepts, connections };
}

export function rankDatasets(scope, query) {
  const terms = termsFor(query);
  return scope.datasets.map((dataset) => {
    const fields = (dataset.fields || []).filter(visibleField).map((field) => {
      const c = scope.concepts.get(field.semanticConceptId);
      return { field, score: scoreText([field.name, field.businessName, field.customComment, field.databaseComment, c?.name, c?.definition, ...(c?.aliases || [])].join(" "), query, terms) };
    });
    const score = scoreText([dataset.name, dataset.purpose, dataset.database, dataset.table, dataset.tableComment].join(" "), query, terms) * 2 + Math.max(0, ...fields.map((f) => f.score));
    return { dataset, score, fields };
  }).filter((item) => !query || item.score > 0).sort((a, b) => b.score - a.score || a.dataset.id.localeCompare(b.dataset.id));
}

function datasetSummary(dataset, scope) {
  const c = scope.connections.get(dataset.connectionId);
  return { id: dataset.id, name: dataset.name, purpose: dataset.purpose || "",
    source: { connectionId: dataset.connectionId, connectionName: c?.name || "", databaseType: c?.type || "unknown", database: dataset.database, table: dataset.table },
    fieldCount: (dataset.fields || []).filter(visibleField).length };
}

function pageOptions(options, config, signature) {
  const limit = options.limit === undefined ? 12 : options.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw inputError("每页条数须为 1～30");
  let offset = 0;
  if (options.cursor) {
    try {
      if (typeof options.cursor !== "string" || options.cursor.length > 512) throw new Error();
      const cursor = JSON.parse(Buffer.from(options.cursor, "base64url").toString());
      if (cursor.version !== config.semanticVersion || cursor.signature !== signature || !Number.isInteger(cursor.offset) || cursor.offset < 0) throw new Error();
      offset = cursor.offset;
    } catch { throw inputError("目录已更新或翻页条件改变，请从第一页重新检索", 409); }
  }
  return { limit, offset, cursor: (next) => Buffer.from(JSON.stringify({ version: config.semanticVersion, signature, offset: next })).toString("base64url") };
}

export function searchDatasetCatalog(config, options = {}) {
  const query = questionText(options.keyword);
  const scope = semanticScope(config, options.topologyId);
  const ranked = rankDatasets(scope, query);
  const page = pageOptions(options, config, hash([query, options.topologyId || ""]));
  const datasets = ranked.slice(page.offset, page.offset + page.limit).map((r) => ({ ...datasetSummary(r.dataset, scope),
    matchedFields: r.fields.filter((f) => f.score > 0).slice(0, 3).map((f) => f.field.name) }));
  return { semanticVersion: config.semanticVersion, datasets, total: ranked.length,
    nextCursor: page.offset + datasets.length < ranked.length ? page.cursor(page.offset + datasets.length) : null };
}

export function compactField(field) {
  const meaning = uniqueText(field.customComment || field.databaseComment);
  const label = String(field.businessName || "").trim();
  return { name: field.name, type: field.dataType,
    ...(label && !meaning.includes(label) ? { label } : {}), ...(meaning.length ? { meaning: meaning[0] } : {}),
    ...(field.semanticConceptId ? { conceptId: field.semanticConceptId } : {}),
    ...(field.primaryKey ? { primaryKey: true } : {}), ...(field.unique ? { unique: true } : {}),
    ...(field.nullable ? { nullable: true } : {}) };
}

export function searchDatasetFields(config, options = {}) {
  const scope = semanticScope(config, options.topologyId);
  const dataset = scope.byId.get(options.datasetId);
  if (!dataset) throw inputError("数据集不存在、未启用或不在所选范围内");
  const query = questionText(options.keyword);
  const terms = termsFor(query);
  const fields = (dataset.fields || []).filter(visibleField).filter((f) => !query || scoreText([f.name, f.businessName, f.customComment, f.databaseComment, scope.concepts.get(f.semanticConceptId)?.name].join(" "), query, terms));
  const page = pageOptions(options, config, hash([dataset.id, query, options.topologyId || ""]));
  const result = fields.slice(page.offset, page.offset + page.limit).map(compactField);
  return { semanticVersion: config.semanticVersion, datasetId: dataset.id, fields: result, total: fields.length,
    nextCursor: page.offset + result.length < fields.length ? page.cursor(page.offset + result.length) : null };
}

function pathBetween(relations, from, to) {
  const graph = new Map();
  for (const r of relations) for (const [a, b] of [[r.source.datasetId, r.target.datasetId], [r.target.datasetId, r.source.datasetId]]) {
    if (!graph.has(a)) graph.set(a, []);
    graph.get(a).push({ to: b, relation: r });
  }
  const queue = [{ id: from, path: [] }], visited = new Set([from]);
  for (let i = 0; i < queue.length; i++) for (const edge of graph.get(queue[i].id) || []) {
    if (visited.has(edge.to)) continue;
    const path = [...queue[i].path, edge.relation];
    if (edge.to === to) return path;
    visited.add(edge.to); queue.push({ id: edge.to, path });
  }
  return undefined;
}

export function prepareTaskContext(config, options = {}, budget = { limit: requestedBudget(options.maxTokens), mode: "standalone", estimated: true }) {
  const query = questionText(options.question);
  const scope = semanticScope(config, options.topologyId);
  const requested = options.datasetIds || (options.datasetId ? [options.datasetId] : []);
  if (!Array.isArray(requested) || requested.length > 8 || requested.some((id) => typeof id !== "string" || !scope.byId.has(id))) throw inputError("请选择范围内的 1～8 个启用数据集，或不指定由问题检索");
  const extra = options.includeFields || [];
  if (!Array.isArray(extra) || extra.length > 100) throw inputError("一次最多补充 100 个字段");
  const ranked = rankDatasets(scope, query);
  const selected = requested.length ? [...new Set(requested)] : ranked.slice(0, 5).map((r) => r.dataset.id);
  if (!query && !requested.length) return fitContext({ status: "needs_selection", semanticVersion: config.semanticVersion,
    nextAction: "请先提供业务问题或数据集标识；目录与字段可分页检索，不自动载入整个拓扑。" }, budget);
  if (!selected.length) return fitContext({ status: "no_match", semanticVersion: config.semanticVersion,
    nextAction: "没有匹配的启用数据集，请换用业务词、概念别名或先检索目录。" }, budget);
  const chosen = new Map(selected.map((id) => [id, new Set()]));
  const reasons = new Map(selected.map((id) => [id, requested.includes(id) ? "指定数据集" : "问题匹配表用途、字段注释或统一语义"]));
  for (const id of selected) {
    const dataset = scope.byId.get(id);
    const scored = ranked.find((r) => r.dataset.id === id);
    const matches = new Set((scored?.fields || []).filter((f) => f.score > 0).map((f) => f.field.name));
    for (const field of (dataset.fields || []).filter(visibleField)) {
      // Retain all recognized identity/time/unit/filter keys, never infer a filter value.
      const guard = field.primaryKey || /(^|_)(tenant|org|unit|time|date|status|enabled)(_|$)/i.test(field.name) || /单位|时间|日期|租户|启用状态/.test(`${field.businessName || ""} ${field.databaseComment || ""} ${field.customComment || ""}`);
      if (!query || matches.has(field.name) || guard) chosen.get(id).add(field.name);
    }
  }
  const relations = new Map(), disconnected = [];
  for (let a = 0; a < selected.length; a++) for (let b = a + 1; b < selected.length; b++) {
    const path = pathBetween(scope.relations, selected[a], selected[b]);
    if (!path) { disconnected.push([selected[a], selected[b]]); continue; }
    for (const r of path) relations.set(r.id, r);
  }
  // Include direct confirmed edges among selected tables, even if BFS chose a different path.
  for (const r of scope.relations) if (chosen.has(r.source.datasetId) && chosen.has(r.target.datasetId)) relations.set(r.id, r);
  for (const r of relations.values()) for (const ep of [r.source, r.target]) {
    if (!chosen.has(ep.datasetId)) { chosen.set(ep.datasetId, new Set()); reasons.set(ep.datasetId, "已确认路径的中间表"); }
    chosen.get(ep.datasetId).add(ep.field);
  }
  for (const ep of extra) {
    if (!ep || !chosen.has(ep.datasetId) || !(scope.byId.get(ep.datasetId).fields || []).some((f) => f.name === ep.field && visibleField(f))) throw inputError("补充字段不存在、不可用或不属于本次选取的数据集");
    chosen.get(ep.datasetId).add(ep.field);
  }
  const conceptIds = new Set();
  const datasets = [...chosen].map(([id, names]) => {
    const dataset = scope.byId.get(id);
    const fields = (dataset.fields || []).filter((f) => visibleField(f) && names.has(f.name)).map((field) => {
      const compact = compactField(field);
      if (compact.conceptId && scope.concepts.has(compact.conceptId)) conceptIds.add(compact.conceptId);
      else delete compact.conceptId;
      return compact;
    });
    return { ...datasetSummary(dataset, scope), fields, selectionReason: reasons.get(id), omittedFields: (dataset.fields || []).filter(visibleField).length - fields.length };
  });
  const context = { contextVersion: TASK_CONTEXT_VERSION, semanticVersion: config.semanticVersion,
    datasets, relations: [...relations.values()].map((r) => ({ id: r.id, type: r.cardinality,
      source: { datasetId: r.source.datasetId, field: r.source.field }, target: { datasetId: r.target.datasetId, field: r.target.field },
      description: r.businessDescription || "" })),
    concepts: [...conceptIds].map((id) => { const c = scope.concepts.get(id); return { id, name: c.name, definition: c.definition || "" }; }) };
  return fitContext({ status: "ok", semanticVersion: config.semanticVersion, context,
    selection: { matchedDatasets: ranked.length, omittedDatasets: Math.max(0, ranked.length - selected.length), disconnected,
      method: "业务词/字段/注释/概念别名检索；关联仅取已确认路径。不是完整结构，不得据缺省字段推断字段不存在。",
      nextAction: "需要更多内容时分页检索目录或字段，以 includeFields 补充；无已确认路径时禁止猜测关联。" } }, budget);
}
