# WorthIt software architecture

WorthIt is a local-first AI work ledger. It separates collection, normalization, storage, pricing, analytics, evaluation, and presentation so new providers can be added without changing the dashboard.

```text
Provider logs -> collectors -> normalized UsageRecord -> local ledger
                                         |-> pricing -> analytics -> dashboard
                                         |-> work receipts -> evaluator -> verdict
```

The first vertical slice is implemented in the web app: a user selects Codex
JSONL files, the browser parses cumulative token snapshots, de-duplicates stable
records, prices them with an explicitly dated public model table, and creates a
pending Work Receipt. The browser ledger uses `localStorage` for the zero-backend
preview. The same state contract is available to Node applications through the
SQLite adapter at `@worthit/storage/node` (Node 22+).

The Work Unit editor turns user-supplied outcome context into first-class data:

```text
user input -> EvidenceItem (reported) -> WorkUnit links + costs
                                      -> WorkReceipt re-evaluation
```

Evidence kinds intentionally distinguish delivery from adoption: `git`, `test`,
`build`, `deploy`, and `artifact` are delivery signals; `user_report` is an
adoption/feedback signal. Human time and other costs are stored on both the Work
Unit and its receipt. A missing hourly rate is represented as an unknown total,
not as zero.

The SQLite adapter stores indexed columns plus the normalized JSON object for
each entity. It enables WAL and foreign keys, applies schema migrations, and
appends an audit row to `ledger_events` for every upsert. Stable IDs make imports
idempotent while preserving the append-oriented audit trail.

```text
UsageRecord       observed model usage and source quality
EvidenceItem      what proves activity, delivery, or adoption
WorkUnit          the smallest meaningful unit being evaluated
WorkReceipt       usage + evidence + verdict + next measurement
```

The evaluator intentionally returns `not_yet` when it sees activity but no
delivery or adoption evidence. Token volume is never treated as value.
