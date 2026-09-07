import type { CostBreakdown, ModelPrice, UsageRecord } from '@worthit/core';

// Public API-equivalent prices. They are estimates, never provider invoices.
export const PRICES: ModelPrice[] = [
  { model: 'gpt-5.6-sol', inputPerMillion: 1.25, cachedInputPerMillion: 0.125, cacheWritePerMillion: 1.25, outputPerMillion: 10, effectiveDate: '2026-09-01' },
  { model: 'gpt-5.6-terra', inputPerMillion: 0.5, cachedInputPerMillion: 0.05, cacheWritePerMillion: 0.5, outputPerMillion: 4, effectiveDate: '2026-09-01' },
  { model: 'gpt-5.5', inputPerMillion: 1.25, cachedInputPerMillion: 0.125, cacheWritePerMillion: 1.25, outputPerMillion: 10, effectiveDate: '2026-09-01' },
];

export function findPrice(model: string, prices = PRICES): ModelPrice | undefined {
  const normalized = model.toLowerCase();
  return [...prices].sort((a, b) => b.model.length - a.model.length).find((p) => normalized.includes(p.model.toLowerCase()));
}

export function priceRecord(record: UsageRecord, prices = PRICES): CostBreakdown {
  const price = findPrice(record.model, prices);
  if (!price) return { input: null, cachedInput: null, cacheWrite: null, output: null, total: null, currency: 'USD', source: 'unknown', model: record.model };
  const input = record.inputTokens / 1_000_000 * price.inputPerMillion;
  const cachedInput = record.cachedInputTokens / 1_000_000 * price.cachedInputPerMillion;
  const cacheWrite = record.cacheWriteTokens / 1_000_000 * price.cacheWritePerMillion;
  const output = record.outputTokens / 1_000_000 * price.outputPerMillion;
  return { input, cachedInput, cacheWrite, output, total: input + cachedInput + cacheWrite + output, currency: 'USD', source: 'estimated', model: price.model };
}
