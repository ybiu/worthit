# WorthIt

**Is this AI-assisted work actually worth it?**

WorthIt is a portable Codex Skill for evaluating the current Codex conversation and/or project: its delivered outcome, evidence, AI and human cost, uncertainty, and whether it was worth continuing.

[English](README_EN.md) · [简体中文](README_ZH.md)

## Quick start

Copy the [`worthit`](worthit) folder into your Codex skills directory, then ask:

```text
Use $worthit to evaluate this Codex conversation and project from the available evidence.
```

Or install it directly with the Skills CLI:

```bash
npx skills add ybiu/worthit --skill worthit -g
```

It reads the current task context first, then checks relevant project files, Git history, tests, or deployment evidence when available. It returns a clear verdict, an evidence-based scorecard, and a machine-readable JSON record. It works even when model bills and token counts are unavailable.

## Repository layout

```text
worthit/
├── SKILL.md                    # Core agent instructions
├── agents/openai.yaml          # Codex interface metadata
├── references/                 # Scoring rubric and JSON contract
└── examples/                   # Example evaluation record
```

See [PRODUCT.md](PRODUCT.md) for product intent and boundaries.
