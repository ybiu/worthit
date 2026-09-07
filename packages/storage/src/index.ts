import type { EvidenceItem, UsageRecord, WorkReceipt, WorkUnit } from '@worthit/core';

export type WorthItState = { usage: UsageRecord[]; evidence: EvidenceItem[]; workUnits: WorkUnit[]; receipts: WorkReceipt[] };
const KEY = 'worthit.state.v1';
const empty = (): WorthItState => ({ usage: [], evidence: [], workUnits: [], receipts: [] });

export function loadState(): WorthItState {
  if (typeof localStorage === 'undefined') return empty();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<WorthItState> | null;
    return { usage: parsed?.usage || [], evidence: parsed?.evidence || [], workUnits: parsed?.workUnits || [], receipts: parsed?.receipts || [] };
  } catch { return empty(); }
}

export function saveState(state: WorthItState): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
}

export function mergeUsage(state: WorthItState, records: UsageRecord[]): WorthItState {
  const known = new Set(state.usage.map((record) => record.id));
  const added = records.filter((record) => !known.has(record.id));
  return { ...state, usage: [...state.usage, ...added].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) };
}

export function updateWorkUnit(state: WorthItState, workUnitId: string, patch: Partial<WorkUnit>): WorthItState {
  return {
    ...state,
    workUnits: state.workUnits.map((unit) => unit.id === workUnitId ? { ...unit, ...patch } : unit),
  };
}

export function resetState(): WorthItState { const state = empty(); saveState(state); return state; }
