# WorthIt

[中文说明](README_ZH.md)

WorthIt is a local-first AI work ledger. It connects token usage, model prices, project activity, delivery evidence, and one practical question: **was the AI-assisted work worth its cost?**

This repository is the standalone software product. The Codex Skill lives in [worthit_skill](https://github.com/ybiu/worthit_skill), and the copyable prompt lives in [worthit_prompt](https://github.com/ybiu/worthit_prompt).

## Architecture

```text
Provider logs → collectors → normalized UsageRecord → storage
                                      ├→ pricing → analytics → dashboard
                                      └→ work receipts → evaluator → verdict
```

```text
apps/web/                 # Overview dashboard
packages/core/            # Shared usage and work-receipt types
packages/collectors/      # Provider log adapters
packages/pricing/         # Dated public model prices
packages/analytics/       # Cost, token, and waste-signal aggregation
packages/storage/         # Local SQLite boundary
packages/evaluator/       # Evidence-based WorthIt verdicts
packages/skill/           # Bundled Codex Skill distribution
```

## Run locally

The browser preview requires Node.js 20+. The Node/SQLite adapter currently requires Node.js 22 because it uses the built-in `node:sqlite` API.

```bash
npm install
npm run dev
```

The first vertical slice includes Overview cards, recent activity, a WorthIt signal, and insight cards. Users can attach Git, test, build, deployment, artifact, and user-report evidence to a Work Unit, record human and other costs, and re-evaluate its receipt. The browser adapter uses `localStorage`; Node applications can use `@worthit/storage/node` for SQLite persistence.

## Principles

- Local-first: prompts, credentials, and raw sessions stay on the user's machine.
- Observed, reported, estimated, and unknown values remain distinct.
- API-equivalent cost and subscription allocation are separate estimates, never a combined bill.
- Token volume is a cost signal, not proof of value.

See [docs/architecture.md](docs/architecture.md) and [PRODUCT.md](PRODUCT.md).

## License

[MIT](LICENSE)
