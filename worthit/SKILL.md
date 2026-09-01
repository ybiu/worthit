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

## Return

Return, in this order:

1. State the evaluation source (`conversation`, `project`, `conversation_and_project`, or `imported_context`) and a short verdict with the strongest evidence and biggest caveat.
2. Give a concise scorecard with only applicable dimensions.
3. Return one complete, self-contained HTML document following [the HTML output contract](references/output-contract.md). Do not return JSON. Do not wrap the document in a Markdown code fence unless the user explicitly asks for source code.
4. Name the minimum next measurement or follow-up that could change the verdict, if one exists.

Keep the result candid and decision-useful. Do not invent a baseline, business value, adoption, or causal link between AI usage and outcome. When the record is incomplete, explain the uncertainty rather than forcing a precise ROI.

## References

- Read [references/rubric.md](references/rubric.md) when assigning value scores.
- Read [references/output-contract.md](references/output-contract.md) before producing the HTML report.
