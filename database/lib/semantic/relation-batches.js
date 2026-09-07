import { createHash } from "node:crypto";
import { estimateTokens, inputError } from "./budget.js";
import { semanticScope } from "./retrieval.js";
import { buildRelationPrompt } from "./model.js";
import { generateRuleCandidates } from "./rules.js";

/** Virtual table-pair / field-block plan: every cross-table field pair has a batch. */
export function relationBatchPlan(config, topologyId, options = {}) {
  const scope = semanticScope(config, topologyId);
  const topology = (config.topologies || []).find((t) => t.id === topologyId);
  if (!topology) throw inputError("请选择关系拓扑");
  const inputBudget = options.inputBudget ?? 8000;
  if (!Number.isInteger(inputBudget) || inputBudget < 2000 || inputBudget > 16000) throw inputError("单批输入预算须为 2000～16000");
  const sideBudget = Math.floor((inputBudget - 1400) / 2);
  const sorted = [...scope.datasets].sort((a, b) => a.id.localeCompare(b.id));
  const blocks = sorted.map((dataset) => {
    const fields = (dataset.fields || []).filter((f) => f.enabled !== false && f.sensitive !== true);
    const header = estimateTokens({ id: dataset.id, name: dataset.name, purpose: dataset.purpose, database: dataset.database, table: dataset.table, tableComment: dataset.tableComment });
    const chunks = []; let current = [], size = header;
    for (const field of fields) {
      // Upper bound uses the full original metadata plus concept (final prompt is smaller).
      const tokens = estimateTokens(field) + (scope.concepts.has(field.semanticConceptId) ? estimateTokens(scope.concepts.get(field.semanticConceptId)) : 0);
      if (current.length && (size + tokens > sideBudget || current.length >= 30)) { chunks.push(current); current = []; size = header; }
      current.push(field); size += tokens;
    }
    if (current.length) chunks.push(current);
    return { dataset, chunks };
  }).filter((b) => b.chunks.length);
  // Do not materialize quadratic prompt arrays. A page is mapped by cumulative pair counts.
  let totalBatches = 0;
  for (let a = 0; a < blocks.length; a++) for (let b = a + 1; b < blocks.length; b++) totalBatches += blocks[a].chunks.length * blocks[b].chunks.length;
  const version = createHash("sha256").update(JSON.stringify({ topology: { id: topology.id, name: topology.name, purpose: topology.purpose, datasetIds: topology.datasetIds }, datasets: sorted.map((d) => ({ ...d, updatedAt: undefined })), concepts: [...scope.concepts.values()], inputBudget })).digest("hex").slice(0, 24);
  const at = (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= totalBatches) throw inputError("识别批次不存在");
    let remaining = index;
    for (let a = 0; a < blocks.length; a++) for (let b = a + 1; b < blocks.length; b++) {
      const count = blocks[a].chunks.length * blocks[b].chunks.length;
      if (remaining >= count) { remaining -= count; continue; }
      const left = blocks[a], right = blocks[b];
      const datasets = [{ ...left.dataset, fields: left.chunks[Math.floor(remaining / right.chunks.length)] }, { ...right.dataset, fields: right.chunks[remaining % right.chunks.length] }];
      const localTopology = { ...topology, datasetIds: datasets.map((d) => d.id) };
      const candidates = generateRuleCandidates(datasets, localTopology, { includeBlocked: true, limit: 80 });
      const makePrompt = (evidence) => buildRelationPrompt({ topology: localTopology, datasets, concepts: [...scope.concepts.values()], ruleCandidates: evidence });
      let prompt = makePrompt([]);
      // Rule evidence is optional supporting material. All block fields remain present.
      for (let count = 1; count <= Math.min(8, candidates.length); count++) {
        const withEvidence = makePrompt(candidates.slice(0, count));
        if (estimateTokens(withEvidence.system) + estimateTokens(withEvidence.user) + 64 > inputBudget) break;
        prompt = withEvidence;
      }
      const estimatedTokens = estimateTokens(prompt.system) + estimateTokens(prompt.user) + 64;
      return { index, datasets, candidates, prompt, estimatedTokens, fits: estimatedTokens <= inputBudget };
    }
  };
  const offset = options.offset ?? 0, limit = options.limit ?? 10;
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 20) throw inputError("批次分页参数无效");
  const batches = [];
  for (let index = offset; index < Math.min(totalBatches, offset + limit); index++) {
    const batch = at(index);
    batches.push({ index, datasets: batch.datasets.map((d) => ({ id: d.id, name: d.name, database: d.database, table: d.table, fields: d.fields.length })), estimatedTokens: batch.estimatedTokens, fits: batch.fits });
  }
  return { version, inputBudget, totalBatches, datasetCount: blocks.length, fieldCount: blocks.reduce((n, b) => n + b.chunks.reduce((m, fs) => m + fs.length, 0), 0), batches,
    nextOffset: offset + batches.length < totalBatches ? offset + batches.length : null,
    note: "每次只调用一批，覆盖跨表字段组合；大拓扑可能产生很多批次，建议先缩小业务主题。超长单字段或表用途不会被截断；超预算批次需调整说明或预算。", at };
}
