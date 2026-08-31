# WorthIt

WorthIt helps an AI agent answer a harder question than “did it finish?”: **was the work worth the cost?**

It evaluates one bounded unit of AI-assisted work — a feature, prototype, research pass, writing revision, experiment, or operational task — using outcome evidence, AI and human inputs, uncertainty, and an explicit value rubric.

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
Use $worthit to evaluate this AI-assisted work: [context].
```

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
