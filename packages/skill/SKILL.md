---
name: worthit
description: Evaluate whether a Codex conversation, repository project, or other bounded AI-assisted work was worth its AI, human, and other costs. Use when the user wants an evidence-based review of the current task or project, not a generic AI summary or paste-only questionnaire.
---

# WorthIt

Turn the current Codex conversation and/or project into a comparable, evidence-based value assessment. A work unit can be a feature, bug fix, prototype, research pass, document revision, experiment, or short internal project. The default subject is the current task context, not text the user must manually copy into a new prompt.

## Choose the evaluation source

Use the richest source that is in scope, and say which one you used:

- **Current conversation:** inspect the user requests, agent actions, iterations, rework, decisions, blockers, and final answer. Treat the conversation as the primary evidence for intent, effort, and delivered changes.
- **Current project:** inspect the workspace and repository evidence relevant to the task, such as changed files, Git history, tests, build output, deployment state, and documentation. Do not inspect unrelated files merely to inflate the score.
- **Conversation + project (default for coding):** connect the requests to the actual project result. Distinguish what the conversation claims from what the repository or tests verify.
- **Imported context:** use pasted text or an uploaded record only when a current conversation/project is unavailable or the user explicitly asks to evaluate external material.

Never pretend to see hidden provider billing, unshown turns, private files, or exact token counts. If the runtime does not expose a cost or artifact, record it as unknown and continue with the evidence that is available.

## Evaluate

1. Define the smallest meaningful work unit from the current conversation and project. Split a broad initiative when its outcomes or costs cannot be assessed together.
2. Reconstruct the goal, starting state, important iterations, AI contribution, human decisions, rework, final artifact, and outcome evidence from the available context. For a repository, use the current diff and relevant history/tests rather than relying on descriptions alone.
3. Collect cost evidence available in the current task: exposed usage metadata, user-reported AI billing, human time visible in the interaction, and material tooling or hosting cost. Do not require token exports, model APIs, invoices, or a dollar estimate when they are unavailable.
4. Mark each non-trivial input as `observed`, `reported`, `estimated`, or `unknown`. Never present an estimate as an invoice or measured result. Keep conversation claims and project observations separate when they conflict.
5. Use the applicable 0–5 dimensions in [the rubric](references/rubric.md). Score from evidence; omit a dimension when it does not fit the work unit.
6. Give a verdict:
   - `worth_it` — the delivered or likely value is well supported relative to cost.
   - `promising` — value is plausible, but decisive evidence is still missing.
   - `not_yet` — the work is too early to judge.
   - `not_worth_it` — available evidence shows a poor cost-to-value fit.
7. Compute monetary ROI only when the benefit estimate has a stated basis. Otherwise use a qualitative assessment; tokens alone are not a measure of value.

### Cost data safeguards

- Treat missing, inaccessible, or unexposed usage as `unknown`, never as `0`.
- A numeric zero is allowed only when the conversation, provider record, or project evidence explicitly says that the quantity was zero or free; label that source.
- Before delivering the report, scan every AI cost cell. If an input/output token count, unit price, or cost is `0` without explicit evidence, replace it with `未知`/`Unknown` and add the field to the limits.

### Two cost views

Keep these two figures separate in every report:

- **API-equivalent cost (estimate):** price observed input, cached input, cache-write input, and output tokens using a dated public API price table for the exact model. It is a reproducible estimate, not a Codex subscription invoice.
- **Subscription consumption estimate (estimate):** allocate the user's stated subscription-period price to this task only when a stated, defensible usage share or quota share exists. It is an allocation of subscription value, not an additional charge.

When a local Codex session log and a price configuration are available, use [scripts/codex_cost_report.py](scripts/codex_cost_report.py) to read cumulative usage and produce the cost section. Use [references/cost-config.example.toml](references/cost-config.example.toml) as the configuration contract. Never substitute API-equivalent cost for subscription cost, add the two together, or call either one an invoice.

### Report language

- Follow an explicit language request first.
- Otherwise detect the language of the user's current conversation. Use the dominant language of the user's substantive messages; if mixed, use the latest substantive user message as the tie-breaker.
- Write all visible labels, headings, verdict text, explanations, and the `<html lang>` attribute in that language. Do not show bilingual labels by default. Use bilingual text only when the user asks for it.

## Return

Return, in this order:

1. State the evaluation source (`conversation`, `project`, `conversation_and_project`, or `imported_context`) and a short verdict with the strongest evidence and biggest caveat.
2. Return one complete, self-contained HTML document following [the HTML output contract](references/output-contract.md). Do not return JSON. Do not wrap the document in a Markdown code fence unless the user explicitly asks for source code.
3. Ensure the first report section after the header is AI cost, with input and output shown separately.
4. Make the final report section **Prompt engineering recommendations / 提示词工程建议**. Analyze the user's actual requests in this conversation (or imported input when that is the declared source), then give concrete suggestions for improving goal clarity, context, constraints, acceptance criteria, evidence, and output format. Include a concise rewritten prompt only when it would materially help.
5. Name the minimum next measurement or follow-up that could change the verdict, if one exists; it may appear immediately before the final recommendations section.

Keep the result candid and decision-useful. Do not invent a baseline, business value, adoption, or causal link between AI usage and outcome. When the record is incomplete, explain the uncertainty rather than forcing a precise ROI.

Prompt recommendations are a separate usability critique. Do not let a well-written prompt increase project value scores, and do not penalize a valuable outcome merely because the user's initial request was terse. Do not reproduce secrets, private credentials, or unnecessary personal data from the conversation.

## References

- Read [references/rubric.md](references/rubric.md) when assigning value scores.
- Read [references/output-contract.md](references/output-contract.md) before producing the HTML report.
