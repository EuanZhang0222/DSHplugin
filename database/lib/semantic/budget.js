/** Conservative, explicit preflight estimates; not a provider tokenizer or billing count. */
export const DEFAULT_CONTEXT_TOKENS = 6000;
export const MAX_CONTEXT_TOKENS = 16000;
const reservations = new WeakMap();
const reservationKey = Symbol("semantic-response-reservation");

export function reserveResponse(budget, result) {
  if (budget[reservationKey]) budget[reservationKey].tokens += estimateTokens(result);
  return result;
}

export function inputError(message, status = 400) {
  return Object.assign(new Error(message), { status, semanticInputError: true });
}

export function estimateTokens(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  let weight = 0;
  for (const char of text || "") weight += char.codePointAt(0) < 128 ? 1 / 3 : 1.5;
  return Math.ceil(weight) + 32;
}

export function requestedBudget(value) {
  if (value === undefined) return DEFAULT_CONTEXT_TOKENS;
  if (!Number.isInteger(value) || value < 1024 || value > MAX_CONTEXT_TOKENS) {
    throw inputError("单次语义预算须为 1024～16000 个 Token（文本计量单位）");
  }
  return value;
}

/** Read only documented optional Harness services. A web preview has no agent session. */
export async function resolveContextBudget(sctx, requested, execution) {
  const cap = requestedBudget(requested);
  const budget = { limit: cap, requested: cap, mode: "standalone", estimated: true,
    note: "估算值，未计入实际会话历史；智能体调用时会重新检查。" };
  const agent = execution?.agent;
  const session = agent?.session;
  if (!session) return budget;
  const get = (name) => agent.ctx?.get?.(name) || sctx.get?.(name);
  try {
    const header = session.requestHeader?.();
    const config = header?.config;
    const meter = get("tokenMeter");
    const llm = get("llm");
    if (!config?.provider || !config?.model || !meter?.measure || !llm?.resolveModelInfo) throw new Error("unavailable");
    const info = await llm.resolveModelInfo(config.provider, config.model, execution.signal);
    const window = info?.context?.contextWindow;
    const measurement = meter.measure(session);
    const used = measurement?.totalTokens;
    if (!Number.isFinite(window) || window <= 0 || !Number.isFinite(used) || used < 0) throw new Error("unavailable");
    const outputReserve = Math.max(4096, Number(config.maxTokens) || Number(info.defaultMaxTokens) || 0);
    const safetyReserve = Math.max(2048, Math.ceil(window * 0.05));
    let reservation = reservations.get(session);
    if (!reservation || reservation.revision !== measurement.logRevision || reservation.used !== used) {
      reservation = { revision: measurement.logRevision, used, tokens: 0 }; reservations.set(session, reservation);
    }
    const resolved = { ...budget, mode: "session", window, used: Math.ceil(used), reservedResponses: reservation.tokens, outputReserve, safetyReserve,
      limit: Math.max(0, Math.floor(Math.min(cap, window - used - reservation.tokens - outputReserve - safetyReserve))),
      note: "已结合宿主会话用量和模型窗口，预留回答与安全余量；发送前仍为估算。" };
    Object.defineProperty(resolved, reservationKey, { value: reservation });
    return resolved;
  } catch (error) {
    execution?.signal?.throwIfAborted?.();
    return { ...budget, mode: "fallback", note: "宿主未提供完整窗口或会话计量，仅执行单次预算；不代表整个会话一定可容纳。" };
  }
}

/** Never cut field meanings or joins. The entire response, including diagnostics, is metered. */
export function fitContext(value, budget) {
  const result = { ...value, budget };
  let tokens = estimateTokens(result);
  if (tokens > budget.limit) {
    return { status: "budget_exceeded", semanticVersion: value.semanticVersion,
      budget: { ...budget, requiredEstimate: tokens },
      nextAction: "请缩小数据集/字段范围或分次提问；未发送不完整语义，也未截断关联键和业务说明。" };
  }
  result.budget = { ...budget, estimatedTokens: tokens + 16 };
  tokens = estimateTokens(result);
  result.budget.estimatedTokens = tokens;
  if (estimateTokens(result) > budget.limit) return fitContext(value, { ...budget, limit: Math.max(0, budget.limit - 64) });
  return result;
}
