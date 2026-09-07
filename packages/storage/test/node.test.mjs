import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openLedger } from '../src/node.js';

const usage = (id, timestamp, provider = 'codex') => ({
  id,
  timestamp,
  provider,
  model: 'gpt-5.5',
  project: 'worthit',
  sessionId: 'session-1',
  inputTokens: 10,
  cachedInputTokens: 2,
  cacheWriteTokens: 0,
  outputTokens: 5,
  reasoningOutputTokens: 1,
  source: 'observed',
});

const evidence = (id, kind = 'test') => ({
  id,
  kind,
  source: 'reported',
  confidence: 'high',
  summary: `${kind} passed`,
  timestamp: '2026-09-07T10:00:00.000Z',
  details: 'Recorded by the user.',
});

const workUnit = {
  id: 'work-1',
  title: 'SQLite persistence',
  goal: 'Persist work evidence locally',
  status: 'in_progress',
  usageRecordIds: ['usage-1'],
  evidenceIds: ['evidence-1'],
  createdAt: '2026-09-07T09:00:00.000Z',
  humanCost: { minutes: 30, hourlyRate: 60, total: 30, currency: 'USD', source: 'reported' },
  otherCosts: [{ id: 'other-1', label: 'CI minutes', amount: 1.5, currency: 'USD', source: 'reported' }],
};

const receipt = {
  id: 'receipt-1',
  workUnitId: 'work-1',
  title: workUnit.title,
  status: 'in_progress',
  records: [usage('usage-1', '2026-09-07T09:30:00.000Z')],
  evidence: [evidence('evidence-1')],
  filesTouched: ['packages/storage/src/node.js'],
  checks: ['node --test'],
  valueScores: { adoptionConfidence: 2 },
  humanCost: workUnit.humanCost,
  otherCosts: workUnit.otherCosts,
  verdict: 'promising',
  verdictReason: 'A test is recorded.',
  confidence: 'medium',
  nextMeasurement: 'Use the adapter in a real workflow.',
};

async function tempLedger() {
  const dir = await mkdtemp(join(tmpdir(), 'worthit-'));
  const path = join(dir, 'ledger.sqlite3');
  return { dir, path, ledger: openLedger(path) };
}

test('saves a bundle idempotently and supports indexed queries', async () => {
  const { path, ledger } = await tempLedger();
  try {
    const bundle = { usage: [usage('usage-1', '2026-09-07T09:30:00.000Z')], evidence: [evidence('evidence-1')], workUnits: [workUnit], receipts: [receipt] };
    ledger.saveBundle(bundle);
    const first = ledger.counts();
    ledger.saveBundle(bundle);
    assert.deepEqual(ledger.counts(), { usage: 1, evidence: 1, workUnits: 1, receipts: 1, events: 8 });
    assert.equal(first.usage, 1);
    assert.equal(ledger.listUsage({ provider: 'codex' }).length, 1);
    assert.equal(ledger.listUsage({ workUnitId: 'work-1' }).length, 1);
    assert.equal(ledger.listUsage({ provider: 'claude' }).length, 0);
    assert.equal(ledger.listEvidence('work-1').length, 1);
    assert.equal(ledger.listReceipts('work-1').length, 1);
    assert.equal(ledger.listWorkUnits()[0].humanCost.total, 30);
    assert.equal((await readFile(path)).length > 0, true);
  } finally {
    ledger.close();
  }
});

test('rolls back a failed transaction', async () => {
  const { ledger } = await tempLedger();
  try {
    assert.throws(() => ledger.transaction(() => {
      ledger.upsertWorkUnit(workUnit);
      throw new Error('intentional failure');
    }), /intentional failure/);
    assert.deepEqual(ledger.counts(), { usage: 0, evidence: 0, workUnits: 0, receipts: 0, events: 0 });
  } finally {
    ledger.close();
  }
});
