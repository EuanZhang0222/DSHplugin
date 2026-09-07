/**
 * 数据库语义层关系规则引擎。
 *
 * 所有分数都来自可复算的确定性证据；大模型不得直接修改这些分数。
 * 规则版本写入每条候选关系，便于后续审计与重算。
 */

export const RELATION_RULE_VERSION = "relation-rules/1.0.0";

export const RELATION_RULE_WEIGHTS = Object.freeze({
  keyStructure: 30,
  semanticMeaning: 25,
  typeCompatibility: 15,
  nameSimilarity: 10,
  valueOverlap: 15,
  topologyContext: 5,
});

export const RELATION_THRESHOLDS = Object.freeze({
  high: 85,
  medium: 70,
  low: 55,
});

const IDENTIFIER_ALIASES = new Map([
  ["id", "identifier"],
  ["ids", "identifier"],
  ["code", "identifier"],
  ["codes", "identifier"],
  ["no", "identifier"],
  ["number", "identifier"],
  ["num", "identifier"],
  ["key", "identifier"],
  ["uuid", "identifier"],
  ["uid", "identifier"],
  ["标识", "identifier"],
  ["编号", "identifier"],
  ["编码", "identifier"],
]);

const TYPE_FAMILIES = Object.freeze({
  numeric: /^(tinyint|smallint|mediumint|int|integer|bigint|uint\d+|int\d+|float|double|real|decimal|numeric)/i,
  string: /^(char|varchar|text|tinytext|mediumtext|longtext|string|fixedstring|lowcardinality\s*\(\s*string)/i,
  temporal: /^(date|datetime|datetime64|timestamp|time|year)/i,
  boolean: /^(bool|boolean|bit\s*\(\s*1\s*\)|uint8)/i,
  binary: /^(binary|varbinary|blob|tinyblob|mediumblob|longblob)/i,
  uuid: /^(uuid)/i,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function splitName(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((token) => IDENTIFIER_ALIASES.get(token) ?? token);
}

function compactText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_]+/gu, "");
}

function ngrams(value, size = 2) {
  const text = compactText(value);
  if (text.length === 0) return new Set();
  if (text.length <= size) return new Set([text]);
  const result = new Set();
  for (let index = 0; index <= text.length - size; index += 1) {
    result.add(text.slice(index, index + size));
  }
  return result;
}

function jaccard(left, right) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / union.size;
}

export function nameSimilarity(left, right) {
  const leftTokens = new Set(splitName(left));
  const rightTokens = new Set(splitName(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  if ([...leftTokens].join("|") === [...rightTokens].join("|")) return 1;
  return jaccard(leftTokens, rightTokens);
}

export function textSimilarity(left, right) {
  const leftText = compactText(left);
  const rightText = compactText(right);
  if (leftText.length === 0 || rightText.length === 0) return 0;
  if (leftText === rightText) return 1;
  if (leftText.includes(rightText) || rightText.includes(leftText)) {
    return Math.min(leftText.length, rightText.length) / Math.max(leftText.length, rightText.length);
  }
  return jaccard(ngrams(leftText), ngrams(rightText));
}

function unwrapType(value) {
  let result = String(value ?? "").trim().toLowerCase();
  let previous = "";
  while (result !== previous) {
    previous = result;
    result = result
      .replace(/^nullable\s*\((.*)\)$/i, "$1")
      .replace(/^lowcardinality\s*\((.*)\)$/i, "$1")
      .trim();
  }
  return result;
}

export function typeFamily(value) {
  const type = unwrapType(value);
  for (const [family, pattern] of Object.entries(TYPE_FAMILIES)) {
    if (pattern.test(type)) return family;
  }
  return type.length > 0 ? `other:${type.replace(/\(.*/, "")}` : "unknown";
}

export function typeCompatibility(left, right) {
  const leftType = unwrapType(left);
  const rightType = unwrapType(right);
  if (leftType.length === 0 || rightType.length === 0) {
    return { compatible: false, score: 0, level: "unknown", detail: "至少一个字段缺少数据库类型" };
  }
  if (leftType === rightType) {
    return { compatible: true, score: 15, level: "exact", detail: `数据库类型完全一致：${leftType}` };
  }
  const leftFamily = typeFamily(leftType);
  const rightFamily = typeFamily(rightType);
  if (leftFamily === rightFamily) {
    return { compatible: true, score: 12, level: "family", detail: `数据库类型属于同一类型族：${leftFamily}` };
  }
  if (leftFamily === "uuid" && rightFamily === "string" || leftFamily === "string" && rightFamily === "uuid") {
    return { compatible: true, score: 8, level: "coercible", detail: "UUID（通用唯一标识）与字符串可在显式转换后比较" };
  }
  return {
    compatible: false,
    score: 0,
    level: "incompatible",
    detail: `类型族不兼容：${leftFamily} 与 ${rightFamily}`,
  };
}

function endpoint(dataset, field) {
  return {
    datasetId: dataset.id,
    connectionId: dataset.connectionId,
    database: dataset.database,
    table: dataset.table,
    field: field.name,
  };
}

function semanticText(field) {
  return [field.businessName, field.customComment, field.databaseComment]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join("；");
}

function referenceMatches(sourceField, targetDataset, targetField) {
  const references = Array.isArray(sourceField.references) ? sourceField.references : [];
  return references.some((reference) =>
    String(reference.database ?? "").toLowerCase() === String(targetDataset.database ?? "").toLowerCase()
    && String(reference.table ?? "").toLowerCase() === String(targetDataset.table ?? "").toLowerCase()
    && String(reference.field ?? "").toLowerCase() === String(targetField.name ?? "").toLowerCase());
}

function identifierLike(field) {
  const tokens = splitName(field.name);
  return tokens.includes("identifier") || field.primaryKey === true || field.unique === true;
}

function relationLevel(score) {
  if (score >= RELATION_THRESHOLDS.high) return "high";
  if (score >= RELATION_THRESHOLDS.medium) return "medium";
  if (score >= RELATION_THRESHOLDS.low) return "low";
  return "hidden";
}

export function inferCardinality(sourceField, targetField) {
  const sourceUnique = sourceField.primaryKey === true || sourceField.unique === true;
  const targetUnique = targetField.primaryKey === true || targetField.unique === true;
  if (sourceUnique && targetUnique) return "one-to-one";
  if (!sourceUnique && targetUnique) return "many-to-one";
  if (sourceUnique && !targetUnique) return "one-to-many";
  return "many-to-many";
}

function evidence(code, label, weight, score, detail, measuredValue) {
  return {
    code,
    label,
    weight,
    score: clamp(Math.round(score * 100) / 100, 0, weight),
    detail,
    ...(measuredValue === undefined ? {} : { measuredValue }),
  };
}

/**
 * 对一个有方向的字段对进行确定性评分。
 * sampleMetrics 只包含统计值，不得携带或持久化原始样例值。
 */
export function scoreRelationPair({ sourceDataset, sourceField, targetDataset, targetField, sampleMetrics }) {
  const hardBlocks = [];
  const type = typeCompatibility(sourceField.dataType, targetField.dataType);
  if (!type.compatible) hardBlocks.push(type.detail);

  const explicitForeignKey = referenceMatches(sourceField, targetDataset, targetField);
  const targetUnique = targetField.primaryKey === true || targetField.unique === true;
  const sourceIndexed = sourceField.indexed === true || sourceField.primaryKey === true || sourceField.unique === true;
  let keyScore = 0;
  let keyDetail = "未发现数据库约束或唯一键证据";
  if (explicitForeignKey) {
    keyScore = RELATION_RULE_WEIGHTS.keyStructure;
    keyDetail = "数据库外键精确指向目标字段";
  } else {
    if (targetUnique) keyScore += 20;
    if (sourceIndexed) keyScore += 5;
    if (identifierLike(sourceField) && identifierLike(targetField)) keyScore += 5;
    keyDetail = [
      targetUnique ? "目标字段为主键或唯一键" : "目标字段不是已知唯一键",
      sourceIndexed ? "来源字段已建立索引" : "来源字段未发现索引",
      identifierLike(sourceField) && identifierLike(targetField) ? "两侧均具有标识字段特征" : "标识字段特征不足",
    ].join("；");
  }

  const sameConcept = Boolean(sourceField.semanticConceptId)
    && sourceField.semanticConceptId === targetField.semanticConceptId;
  const semanticSimilarity = textSimilarity(semanticText(sourceField), semanticText(targetField));
  const semanticScore = (sameConcept ? 15 : 0) + Math.round(semanticSimilarity * 10 * 100) / 100;
  const semanticDetail = sameConcept
    ? `绑定同一统一语义概念；注释相似度 ${(semanticSimilarity * 100).toFixed(1)}%`
    : `未绑定同一统一语义概念；注释相似度 ${(semanticSimilarity * 100).toFixed(1)}%`;

  const names = nameSimilarity(sourceField.name, targetField.name);
  const nameScore = Math.round(names * RELATION_RULE_WEIGHTS.nameSimilarity * 100) / 100;

  let valueScore = 0;
  let valueDetail = "未启用脱敏值匹配，不计分";
  let valueMeasured;
  if (sampleMetrics && Number.isFinite(sampleMetrics.coverage)) {
    const coverage = clamp(sampleMetrics.coverage, 0, 1);
    valueMeasured = {
      coverage,
      sourceDistinct: sampleMetrics.sourceDistinct ?? 0,
      targetDistinct: sampleMetrics.targetDistinct ?? 0,
      matchedDistinct: sampleMetrics.matchedDistinct ?? 0,
      truncated: sampleMetrics.truncated === true,
    };
    if (coverage >= 0.98) valueScore = 15;
    else if (coverage >= 0.9) valueScore = 12;
    else if (coverage >= 0.75) valueScore = 8;
    else if (coverage >= 0.5) valueScore = 4;
    valueDetail = `脱敏去重值覆盖率 ${(coverage * 100).toFixed(1)}%`;
    if (coverage < 0.2 && (sampleMetrics.sourceDistinct ?? 0) >= 20) {
      hardBlocks.push("脱敏值匹配覆盖率低于20%，且样本量足以判定不匹配");
    }
  }

  const topologyScore = RELATION_RULE_WEIGHTS.topologyContext;
  const items = [
    evidence("key-structure", "数据库约束与键结构", 30, keyScore, keyDetail, { explicitForeignKey, targetUnique, sourceIndexed }),
    evidence("semantic-meaning", "统一语义与业务注释", 25, semanticScore, semanticDetail, { sameConcept, similarity: semanticSimilarity }),
    evidence("type-compatibility", "字段类型兼容性", 15, type.score, type.detail, { level: type.level }),
    evidence("name-similarity", "字段名称与别名", 10, nameScore, `标准化名称相似度 ${(names * 100).toFixed(1)}%`, { similarity: names }),
    evidence("value-overlap", "脱敏值匹配", 15, valueScore, valueDetail, valueMeasured),
    evidence("topology-context", "业务拓扑范围", 5, topologyScore, "两张表均位于当前选择的业务主题拓扑"),
  ];
  const weightedScore = Math.round(items.reduce((sum, item) => sum + item.score, 0));
  // 已由数据库声明的外键本身就是确定性关系证据。评分明细仍保留100分模型，
  // 对外置信度使用100分约束覆盖，避免注释缺失导致真实外键落在候选阈值以下。
  const confidence = explicitForeignKey ? 100 : weightedScore;
  const cardinality = inferCardinality(sourceField, targetField);
  if (cardinality === "many-to-many" && !explicitForeignKey) {
    hardBlocks.push("两侧字段都不是已知唯一键，不能直接确认一对多或多对一；应寻找中间映射表");
  }
  return {
    ruleVersion: RELATION_RULE_VERSION,
    source: endpoint(sourceDataset, sourceField),
    target: endpoint(targetDataset, targetField),
    cardinality,
    confidence,
    weightedScore,
    level: relationLevel(confidence),
    evidence: items,
    hardBlocks,
    eligible: hardBlocks.length === 0 && (explicitForeignKey || confidence >= RELATION_THRESHOLDS.low),
    explicitForeignKey,
  };
}

function pairKey(sourceDataset, sourceField, targetDataset, targetField) {
  const left = `${sourceDataset.id}:${sourceField.name}`;
  const right = `${targetDataset.id}:${targetField.name}`;
  return [left, right].sort().join("<->");
}

function enabledFields(dataset) {
  return (Array.isArray(dataset.fields) ? dataset.fields : [])
    .filter((field) => field.enabled !== false && field.sensitive !== true);
}

/** 枚举当前拓扑内的确定性规则候选，并按无方向字段对去重。 */
export function generateRuleCandidates(datasets, topology, options = {}) {
  const datasetIds = new Set(Array.isArray(topology?.datasetIds) ? topology.datasetIds : []);
  const scoped = datasets.filter((dataset) => datasetIds.has(dataset.id) && dataset.enabled !== false);
  const byPair = new Map();
  const sampleMetricsByPair = options.sampleMetricsByPair instanceof Map ? options.sampleMetricsByPair : new Map();
  for (let leftIndex = 0; leftIndex < scoped.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < scoped.length; rightIndex += 1) {
      const leftDataset = scoped[leftIndex];
      const rightDataset = scoped[rightIndex];
      for (const leftField of enabledFields(leftDataset)) {
        for (const rightField of enabledFields(rightDataset)) {
          const key = pairKey(leftDataset, leftField, rightDataset, rightField);
          const sampleMetrics = sampleMetricsByPair.get(key);
          const forward = scoreRelationPair({
            sourceDataset: leftDataset,
            sourceField: leftField,
            targetDataset: rightDataset,
            targetField: rightField,
            sampleMetrics,
          });
          const reverse = scoreRelationPair({
            sourceDataset: rightDataset,
            sourceField: rightField,
            targetDataset: leftDataset,
            targetField: leftField,
            sampleMetrics: sampleMetrics && {
              ...sampleMetrics,
              coverage: Number.isFinite(sampleMetrics.reverseCoverage) ? sampleMetrics.reverseCoverage : sampleMetrics.coverage,
              sourceDistinct: sampleMetrics.targetDistinct,
              targetDistinct: sampleMetrics.sourceDistinct,
            },
          });
          const selected = forward.explicitForeignKey && !reverse.explicitForeignKey
            ? forward
            : reverse.explicitForeignKey && !forward.explicitForeignKey
              ? reverse
              : forward.confidence >= reverse.confidence ? forward : reverse;
          if (selected.eligible || options.includeBlocked === true && selected.confidence >= RELATION_THRESHOLDS.low) {
            const existing = byPair.get(key);
            if (!existing || selected.confidence > existing.confidence) byPair.set(key, { ...selected, pairKey: key });
          }
        }
      }
    }
  }
  return [...byPair.values()]
    .sort((left, right) => right.confidence - left.confidence || left.pairKey.localeCompare(right.pairKey))
    .slice(0, Number.isInteger(options.limit) ? clamp(options.limit, 1, 500) : 200);
}

export function getRuleDefinition() {
  return {
    version: RELATION_RULE_VERSION,
    weights: RELATION_RULE_WEIGHTS,
    thresholds: RELATION_THRESHOLDS,
    hardGates: [
	  "数据库声明的外键直接形成100分确定性候选，但仍需人工确认后发布",
      "字段类型族不兼容",
      "脱敏值覆盖率低于20%且样本量不少于20",
      "两侧均非已知唯一键时不得直接确认一对多或多对一",
      "敏感字段默认不参与自动识别",
      "只有当前拓扑内的数据集才参与本次识别",
      "自动结果始终为候选，必须人工确认",
    ],
  };
}
