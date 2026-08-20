# WorthIt

**语言 / Language:** [简体中文](README.zh-CN.md) · [English](README.en.md)

WorthIt is a local-first project for evaluating the productivity and return on investment of AI agents.

It asks a practical question: is the real value of code, papers, prototypes, or business projects created with agents such as Codex and Claude Code proportional to the AI cost, human time, and other inputs consumed?

## Core approach

WorthIt does not equate token volume with value. It models an AI-assisted task as:

```text
AI cost + human cost + other costs
                         ↓
                deliverables and evidence
                         ↓
        quality, usefulness, novelty, and adoption
                         ↓
                             ROI
```

The smallest evaluation unit is a `work_unit`: for example, one feature, bug fix, prototype, experiment, paper draft, or short internal project. Each unit records:

- AI, human, and other costs
- The actual deliverable and verifiable evidence
- Delivery, practical value, quality/rigor, novelty/insight, and adoption confidence (0–5)
- Qualitative or monetized ROI

## Current status

The project is currently a local-first core MVP with support for:

- WorthIt CLI
- A unified `work_unit` JSON model
- Local JSONL storage
- Cost, value-score, and grouped summaries
- Codex usage discovery and Claude Code JSONL import
- Pricing, billing, human-cost, and outcome submissions
- Record validation
- A standalone evaluation prompt usable in any AI product

## Quick start

Requires Node.js 20 or newer:

```bash
npm run worthit -- init
npm run worthit -- add --file examples/coding-work-unit.json
npm run worthit -- list
npm run worthit -- analyze
npm run worthit -- validate
```

Data is stored in `data/` by default. To use another directory:

```powershell
$env:WORTHIT_DATA_DIR = "D:\worthit-data"
npm run worthit -- analyze
```

## Standalone prompt

You can evaluate a task without installing WorthIt by pasting your context into any AI product:

[Standalone evaluation prompt](docs/standalone-evaluation-prompt.zh-CN.md)

## Project structure

```text
worthit/
├── apps/cli/                 # CLI
├── apps/web/                 # Local web interface
├── packages/core/            # Shared schema, storage, and metrics
├── examples/                 # Example records and submissions
├── docs/                     # Documentation and standalone prompt
└── data/                     # Default local data directory
```

## Important limitations

Git, PR, issue, deployment, and business-revenue data are not automatically linked yet. Token count is not treated as value. ROI conclusions should be read together with the deliverable and its evidence; incomplete data is explicitly marked as estimated, assumed, or missing.

Return to the [README home](README.md) or switch to [简体中文](README.zh-CN.md).
