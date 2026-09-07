import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Node/SQLite persistence for the WorthIt ledger.
 *
 * SQLite is the durable boundary; the browser adapter in index.ts is only a
 * zero-backend preview. Records are append-oriented and upserted by stable
 * ids, which makes repeated imports idempotent without losing the original
 * normalized object. The JSON columns keep the adapter forward compatible
 * while the indexed columns support the common dashboard queries.
 */
export class SqliteLedger {
  constructor(filePath = '.worthit/worthit.sqlite3') {
    this.filePath = resolve(filePath);
    mkdirSync(dirname(this.filePath), { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS usage_records (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        project TEXT,
        session_id TEXT,
        work_unit_id TEXT,
        input_tokens INTEGER NOT NULL,
        cached_input_tokens INTEGER NOT NULL,
        cache_write_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        reasoning_output_tokens INTEGER NOT NULL,
        source TEXT NOT NULL,
        record_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider);
      CREATE INDEX IF NOT EXISTS idx_usage_work_unit ON usage_records(work_unit_id);
      CREATE TABLE IF NOT EXISTS evidence_items (
        id TEXT PRIMARY KEY,
        work_unit_id TEXT,
        kind TEXT NOT NULL,
        source TEXT NOT NULL,
        confidence TEXT NOT NULL,
        summary TEXT NOT NULL,
        timestamp TEXT,
        details TEXT,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_work_unit ON evidence_items(work_unit_id);
      CREATE TABLE IF NOT EXISTS work_units (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        goal TEXT,
        status TEXT NOT NULL,
        human_cost_json TEXT,
        other_costs_json TEXT,
        work_unit_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_work_status ON work_units(status);
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        work_unit_id TEXT NOT NULL,
        verdict TEXT NOT NULL,
        confidence TEXT NOT NULL,
        receipt_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (work_unit_id) REFERENCES work_units(id)
      );
      CREATE INDEX IF NOT EXISTS idx_receipt_work_unit ON receipts(work_unit_id);
      CREATE TABLE IF NOT EXISTS ledger_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_events_entity ON ledger_events(entity_type, entity_id);
    `);
    this.db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, ?)').run(new Date().toISOString());
  }

  close() { this.db.close(); }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  appendEvent(entityType, entityId, operation, payload) {
    this.db.prepare('INSERT INTO ledger_events(entity_type, entity_id, operation, payload_json, occurred_at) VALUES (?, ?, ?, ?, ?)')
      .run(entityType, entityId, operation, JSON.stringify(payload), new Date().toISOString());
  }

  upsertUsage(record, workUnitId = null) {
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO usage_records
      (id,timestamp,provider,model,project,session_id,work_unit_id,input_tokens,cached_input_tokens,cache_write_tokens,output_tokens,reasoning_output_tokens,source,record_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET timestamp=excluded.timestamp, provider=excluded.provider, model=excluded.model,
      project=excluded.project, session_id=excluded.session_id, work_unit_id=COALESCE(excluded.work_unit_id, usage_records.work_unit_id),
      input_tokens=excluded.input_tokens, cached_input_tokens=excluded.cached_input_tokens, cache_write_tokens=excluded.cache_write_tokens,
      output_tokens=excluded.output_tokens, reasoning_output_tokens=excluded.reasoning_output_tokens, source=excluded.source,
      record_json=excluded.record_json`)
      .run(record.id, record.timestamp, record.provider, record.model, record.project ?? null, record.sessionId ?? null, workUnitId,
        record.inputTokens, record.cachedInputTokens, record.cacheWriteTokens, record.outputTokens, record.reasoningOutputTokens,
        record.source, JSON.stringify(record), now);
    this.appendEvent('usage', record.id, 'upsert', { ...record, workUnitId });
  }

  upsertEvidence(item, workUnitId = null) {
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO evidence_items
      (id,work_unit_id,kind,source,confidence,summary,timestamp,details,evidence_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET work_unit_id=COALESCE(excluded.work_unit_id, evidence_items.work_unit_id), kind=excluded.kind,
      source=excluded.source, confidence=excluded.confidence, summary=excluded.summary, timestamp=excluded.timestamp,
      details=excluded.details, evidence_json=excluded.evidence_json`)
      .run(item.id, workUnitId, item.kind, item.source, item.confidence, item.summary, item.timestamp ?? null, item.details ?? null, JSON.stringify(item), now);
    this.appendEvent('evidence', item.id, 'upsert', { ...item, workUnitId });
  }

  upsertWorkUnit(unit) {
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO work_units
      (id,title,goal,status,human_cost_json,other_costs_json,work_unit_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title,goal=excluded.goal,status=excluded.status,
      human_cost_json=excluded.human_cost_json,other_costs_json=excluded.other_costs_json,work_unit_json=excluded.work_unit_json,updated_at=excluded.updated_at`)
      .run(unit.id, unit.title, unit.goal ?? null, unit.status, JSON.stringify(unit.humanCost ?? null), JSON.stringify(unit.otherCosts ?? []), JSON.stringify(unit), unit.createdAt, now);
    this.appendEvent('work_unit', unit.id, 'upsert', unit);
  }

  upsertReceipt(receipt) {
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO receipts(id,work_unit_id,verdict,confidence,receipt_json,created_at)
      VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET verdict=excluded.verdict,confidence=excluded.confidence,receipt_json=excluded.receipt_json`)
      .run(receipt.id, receipt.workUnitId, receipt.verdict, receipt.confidence, JSON.stringify(receipt), now);
    this.appendEvent('receipt', receipt.id, 'upsert', receipt);
  }

  saveBundle({ usage = [], evidence = [], workUnits = [], receipts = [] }) {
    return this.transaction(() => {
      const usageUnits = new Map(workUnits.flatMap((unit) => unit.usageRecordIds.map((id) => [id, unit.id])));
      const evidenceUnits = new Map(workUnits.flatMap((unit) => unit.evidenceIds.map((id) => [id, unit.id])));
      for (const unit of workUnits) this.upsertWorkUnit(unit);
      for (const record of usage) this.upsertUsage(record, usageUnits.get(record.id) || null);
      for (const item of evidence) this.upsertEvidence(item, evidenceUnits.get(item.id) || null);
      for (const receipt of receipts) this.upsertReceipt(receipt);
      return this.counts();
    });
  }

  counts() {
    const count = (table) => Number(this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
    return { usage: count('usage_records'), evidence: count('evidence_items'), workUnits: count('work_units'), receipts: count('receipts'), events: count('ledger_events') };
  }

  listWorkUnits() {
    return this.db.prepare('SELECT work_unit_json AS value FROM work_units ORDER BY updated_at DESC').all().map((row) => JSON.parse(row.value));
  }

  listEvidence(workUnitId) {
    const rows = workUnitId
      ? this.db.prepare('SELECT evidence_json AS value FROM evidence_items WHERE work_unit_id = ? ORDER BY timestamp DESC, created_at DESC').all(workUnitId)
      : this.db.prepare('SELECT evidence_json AS value FROM evidence_items ORDER BY timestamp DESC, created_at DESC').all();
    return rows.map((row) => JSON.parse(row.value));
  }

  listReceipts(workUnitId) {
    const rows = workUnitId
      ? this.db.prepare('SELECT receipt_json AS value FROM receipts WHERE work_unit_id = ? ORDER BY created_at DESC').all(workUnitId)
      : this.db.prepare('SELECT receipt_json AS value FROM receipts ORDER BY created_at DESC').all();
    return rows.map((row) => JSON.parse(row.value));
  }

  listUsage({ from, to, provider, workUnitId } = {}) {
    const clauses = [], args = [];
    if (from) { clauses.push('timestamp >= ?'); args.push(from); }
    if (to) { clauses.push('timestamp <= ?'); args.push(to); }
    if (provider) { clauses.push('provider = ?'); args.push(provider); }
    if (workUnitId) { clauses.push('work_unit_id = ?'); args.push(workUnitId); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return this.db.prepare(`SELECT record_json AS value FROM usage_records ${where} ORDER BY timestamp`).all(...args).map((row) => JSON.parse(row.value));
  }
}

export function openLedger(filePath) { return new SqliteLedger(filePath); }
