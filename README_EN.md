# WorthIt

WorthIt helps an AI agent answer a harder question than “did it finish?”: **was the work worth the cost?**

It evaluates the current Codex conversation and/or project — a feature, prototype, research pass, writing revision, experiment, or operational task — using conversation history, project evidence, AI and human inputs, uncertainty, and an explicit value rubric.

## Install

Copy the [`worthit`](worthit) directory into your Codex skills directory:

```text
<Codex skills directory>/worthit/
```

Or use the Skills CLI:

```bash
npx skills add ybiu/worthit --skill worthit -g
```

Then invoke it in any task:

```text
Use $worthit to evaluate this Codex conversation and project from the available evidence.
```

WorthIt inspects the current task context first. For coding work it also checks relevant workspace files, Git history, tests, and deployment evidence when available; it does not require you to copy-paste the conversation into a new prompt.

## What you get

- A verdict: `worth_it`, `promising`, `not_yet`, or `not_worth_it`
- A scorecard grounded in delivery, practical value, quality, insight, and adoption evidence
- A valid JSON record for comparison across work units
- A candid account of assumptions, unknowns, and the next measurement worth collecting

## What it does not do

WorthIt does not turn token volume into value, invent financial returns, or require a provider API key. When costs or benefits are unavailable, it provides a qualitative assessment and records the uncertainty.

## Example

See [coding-work-unit.json](worthit/examples/coding-work-unit.json) for a complete record.

## License

[MIT](LICENSE)
