import type { CostBreakdown, UsageRecord } from '@worthit/core';
import { priceRecord } from '@worthit/pricing';

export type UsageSummary = { input: number; cached: number; cacheWrite: number; output: number; total: number; cost: number | null; estimatedRecords: number; unknownCostRecords: number };

export function summarize(records: UsageRecord[]): UsageSummary {
  let cost = 0;
  let hasUnknownCost = false;
  let estimatedRecords = 0;
  for (const record of records) {
    const breakdown = priceRecord(record);
    if (breakdown.total === null) hasUnknownCost = true;
    else cost += breakdown.total;
    if (breakdown.source === 'estimated') estimatedRecords += 1;
  }
  return {
    input: records.reduce((n, r) => n + r.inputTokens, 0),
    cached: records.reduce((n, r) => n + r.cachedInputTokens, 0),
    cacheWrite: records.reduce((n, r) => n + r.cacheWriteTokens, 0),
    output: records.reduce((n, r) => n + r.outputTokens, 0),
    total: records.reduce((n, r) => n + r.inputTokens + r.cachedInputTokens + r.cacheWriteTokens + r.outputTokens, 0),
    cost: hasUnknownCost ? null : cost,
    estimatedRecords,
    unknownCostRecords: records.filter((r) => priceRecord(r).total === null).length,
  };
}

export function recordCost(record: UsageRecord): CostBreakdown { return priceRecord(record); }
