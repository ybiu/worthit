# WorthIt HTML output contract

Return one complete, self-contained HTML document. It must render clearly when saved as `worthit-report.html` and opened in a browser. Do not return JSON, a JSON code block, or a second competing format.

## Required document shape

Use semantic HTML with one `<main>` element and these sections, in order:

1. **Header:** title, verdict badge (`Worth it`, `Promising`, `Not yet`, or `Not worth it`), evaluation source, scenario, and status.
2. **AI cost (first section):** a prominent table with input tokens, input price, input cost, output tokens, output price, output cost, total AI cost, model(s), currency, and source quality. Show `未知`/`Unknown` when unavailable; never silently use zero.
3. **Executive summary:** what was attempted, what it cost, and why the verdict follows.
4. **Human and other costs:** human time/rate/cost and material tooling, hosting, or review costs.
5. **Conversation and project evidence:** distinguish conversation claims from inspected workspace/repository facts. Include relevant files, revision, checks, deployment, adoption, iterations, rework, and blockers only when actually observed.
6. **Value scorecard:** an accessible table of applicable 0–5 scores with one-line evidence for each score. Omit irrelevant dimensions.
7. **ROI and limits:** show monetary benefit, net value, and benefit/cost ratio only when their basis is defensible; otherwise say `定性判断` or `Qualitative` in the report language and explain why.
8. **Next measurement:** the smallest follow-up that could change the verdict.
9. **Prompt engineering recommendations (last section):** analyze the user's input quality and provide actionable improvements. Cover only dimensions relevant to the actual input: goal, context, constraints, acceptance criteria, evidence, and output format. Optionally include a short improved prompt.

## Presentation rules

- Include a small inline `<style>` block; do not depend on external CSS, JavaScript, fonts, images, or network requests.
- Use readable contrast, responsive layout, table headers, and `<caption>` or visually-hidden labels where useful.
- Escape user-provided text for HTML. Do not execute scripts or embed secrets, API keys, private prompts, or raw billing credentials.
- Display provenance beside important values with `observed`, `reported`, `estimated`, or `unknown`.
- Set `<html lang>` to `zh-CN` for Chinese or `en` for English, based on the report-language rules in `SKILL.md`.
- Use one consistent report language for all visible labels and prose; do not default to bilingual labels.
- Keep the report concise enough to scan, but include enough evidence to audit the verdict.
- Keep prompt recommendations distinct from the verdict and value scorecard; they assess how to ask for better work, not whether the delivered work was valuable.
- Do not quote or expose secrets, credentials, private paths, or unnecessary personal data while analyzing the input.

## Cost calculation rules

- If input and output token counts and model-specific prices are available, calculate each side separately: `input_cost = input_tokens × input_price`; `output_cost = output_tokens × output_price`.
- If only a provider-reported total is available, show the total and mark the split as unavailable; do not invent an allocation.
- If token counts or prices are missing, show `未知`/`Unknown` (never `0`) and list the missing field in the limits section.
- Use `0` only for a quantity explicitly confirmed as zero or free by an observed or reported source. An absent value is not zero.
- Never equate more tokens with more value.

## Two estimates, never one bill

Show both rows only when their data exists:

- **API-equivalent cost (estimate):** the input/cache/output token cost under the dated, configured public API price table for the exact model.
- **Subscription consumption estimate (estimate):** `subscription period price × defensible task usage share`. Show the period, allocation basis, and source.

Do not add these values. They answer different questions: API-equivalent cost is a pay-as-you-go comparison; subscription consumption is a proportional allocation of an already-purchased plan. Neither is a provider invoice.

The allowed scenario values are `coding`, `research`, `writing`, `prototype`, `ops`, and `mixed`. The allowed evaluation sources are `conversation`, `project`, `conversation_and_project`, and `imported_context`.
