# Storage

The storage package exposes the ledger boundary used by the MVP. In the browser,
it persists `UsageRecord`, `EvidenceItem`, `WorkUnit`, and `WorkReceipt` in a
versioned `localStorage` key. `updateWorkUnit` performs a pure immutable patch for
editing a work unit in the browser.

Node applications can import `@worthit/storage/node` and use `SqliteLedger`:

```js
import { openLedger } from '@worthit/storage/node';

const ledger = openLedger('.worthit/worthit.sqlite3');
ledger.saveBundle({ usage, evidence, workUnits, receipts });
  console.log(ledger.counts());
  console.log(ledger.listEvidence('work-unit-id'));
ledger.close();
```

The SQLite adapter uses Node 22's built-in `node:sqlite` API, enables WAL and
foreign keys, keeps normalized query columns alongside the original JSON, and
records every upsert in `ledger_events`. Re-importing the same stable IDs is
idempotent. The browser adapter and the SQLite adapter share the same domain
objects, so collectors, pricing, analytics, and evaluation do not depend on the
storage engine.
