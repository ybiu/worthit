# WorthIt HTML output contract

Return one complete, self-contained HTML document. It must render clearly when saved as `worthit-report.html` and opened in a browser. Do not return JSON, a JSON code block, or a second competing format.

## Required document shape

Use semantic HTML with one `<main>` element and these sections, in order:

1. **Header:** title, verdict badge (`Worth it`, `Promising`, `Not yet`, or `Not worth it`), evaluation source, scenario, and status.
2. **Executive summary:** what was attempted, what it cost, and why the verdict follows.
3. **AI cost:** a table with input tokens, input price, input cost, output tokens, output price, output cost, total AI cost, model(s), currency, and source quality. Show `未知`/`Unknown` when unavailable; never silently use zero.
4. **Human and other costs:** human time/rate/cost and material tooling, hosting, or review costs.
5. **Conversation and project evidence:** distinguish conversation claims from inspected workspace/repository facts. Include relevant files, revision, checks, deployment, adoption, iterations, rework, and blockers only when actually observed.
6. **Value scorecard:** an accessible table of applicable 0–5 scores with one-line evidence for each score. Omit irrelevant dimensions.
7. **ROI and limits:** show monetary benefit, net value, and benefit/cost ratio only when their basis is defensible; otherwise say `定性判断 / Qualitative` and explain why.
8. **Next measurement:** the smallest follow-up that could change the verdict.

## Presentation rules

- Include a small inline `<style>` block; do not depend on external CSS, JavaScript, fonts, images, or network requests.
- Use readable contrast, responsive layout, table headers, and `<caption>` or visually-hidden labels where useful.
- Escape user-provided text for HTML. Do not execute scripts or embed secrets, API keys, private prompts, or raw billing credentials.
- Display provenance beside important values with `observed`, `reported`, `estimated`, or `unknown`.
- Use the user's language; bilingual labels are welcome when helpful.
- Keep the report concise enough to scan, but include enough evidence to audit the verdict.

## Cost calculation rules

- If input and output token counts and model-specific prices are available, calculate each side separately: `input_cost = input_tokens × input_price`; `output_cost = output_tokens × output_price`.
- If only a provider-reported total is available, show the total and mark the split as unavailable; do not invent an allocation.
- If token counts or prices are missing, show `未知` and list the missing field in the limits section.
- Never equate more tokens with more value.

The allowed scenario values are `coding`, `research`, `writing`, `prototype`, `ops`, and `mixed`. The allowed evaluation sources are `conversation`, `project`, `conversation_and_project`, and `imported_context`.
