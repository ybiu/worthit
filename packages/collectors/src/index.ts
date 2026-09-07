import type { Provider, UsageRecord } from '@worthit/core';

type JsonObject = Record<string, unknown>;
const asObject = (value: unknown): JsonObject => value && typeof value === 'object' ? value as JsonObject : {};
const asNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const firstString = (...values: unknown[]): string | undefined => values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();

const usageFields = (value: unknown) => {
  const usage = asObject(value);
  return {
    input: asNumber(usage.input_tokens ?? usage.input),
    cached: asNumber(usage.cached_input_tokens ?? usage.cache_read_input_tokens ?? usage.cache_read),
    cacheWrite: asNumber(usage.cache_write_input_tokens ?? usage.cache_creation_input_tokens ?? usage.cache_write),
    output: asNumber(usage.output_tokens ?? usage.output),
    reasoning: asNumber(usage.reasoning_output_tokens ?? usage.reasoning_output),
  };
};
const sumUsage = (u: ReturnType<typeof usageFields>) => u.input + u.cached + u.cacheWrite + u.output + u.reasoning;
const subtract = (a: ReturnType<typeof usageFields>, b: ReturnType<typeof usageFields>) => ({
  input: Math.max(0, a.input - b.input), cached: Math.max(0, a.cached - b.cached),
  cacheWrite: Math.max(0, a.cacheWrite - b.cacheWrite), output: Math.max(0, a.output - b.output),
  reasoning: Math.max(0, a.reasoning - b.reasoning),
});

/** Parse Codex cumulative token_count events into stable, billable deltas. */
export function collectCodexJsonl(text: string, fileName = 'codex-session.jsonl'): UsageRecord[] {
  const records: UsageRecord[] = [];
  let sessionId = fileName.replace(/\.jsonl$/i, '');
  let project: string | undefined;
  let model = 'unknown';
  let previous = usageFields(undefined);
  const seen = new Set<string>();

  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let raw: JsonObject;
    try { raw = asObject(JSON.parse(line)); } catch { continue; }
    const payload = asObject(raw.payload);
    const eventType = firstString(raw.type, payload.type);
    const eventId = firstString(raw.id, raw.event_id);
    if (eventType === 'session_meta' || payload.type === 'session_meta') {
      sessionId = firstString(payload.id, payload.session_id, raw.session_id, sessionId) ?? sessionId;
      project = firstString(payload.cwd, payload.project, raw.cwd, project);
      model = firstString(payload.model, asObject(payload.settings).model, model) ?? model;
    }
    if (eventType === 'turn_context' || payload.type === 'turn_context') model = firstString(payload.model, payload.model_name, model) ?? model;
    if (payload.type !== 'token_count' && eventType !== 'token_count') continue;
    const info = asObject(payload.info ?? raw.info);
    const snapshot = usageFields(info.total_token_usage ?? info.total_usage ?? info.usage);
    const last = usageFields(info.last_token_usage ?? info.last_usage);
    const hasTotal = sumUsage(snapshot) > 0;
    const current = hasTotal ? snapshot : last;
    const signature = [current.input, current.cached, current.cacheWrite, current.output, current.reasoning].join(':');
    if (seen.has(signature)) continue;
    seen.add(signature);
    const usage = hasTotal ? subtract(current, previous) : current;
    if (hasTotal) previous = current;
    if (sumUsage(usage) === 0) continue;
    const timestamp = firstString(raw.timestamp, raw.created_at) ?? new Date().toISOString();
    const stable = eventId ?? signature;
    records.push({
      id: `codex:${sessionId}:${stable}:${index}`, timestamp, provider: 'codex' as Provider, model, project, sessionId,
      inputTokens: Math.max(0, usage.input - usage.cached - usage.cacheWrite), cachedInputTokens: usage.cached,
      cacheWriteTokens: usage.cacheWrite, outputTokens: usage.output, reasoningOutputTokens: usage.reasoning, source: 'observed',
    });
  }
  return records;
}

export function collectCodexSnapshot(raw: Record<string, unknown>, index: number): UsageRecord | null {
  return collectCodexJsonl(JSON.stringify(raw), `snapshot-${index}.jsonl`)[0] ?? null;
}

export type Collector = (text: string, fileName?: string) => UsageRecord[];
export const collectors: Record<string, Collector> = { codex: collectCodexJsonl };
