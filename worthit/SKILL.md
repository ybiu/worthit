---
name: worthit
description: Evaluate whether a bounded AI-assisted piece of work was worth its AI, human, and other costs. Use for coding, research, writing, prototypes, operations, and short projects when the user needs an evidence-based value assessment rather than a generic AI summary.
---

# WorthIt

Turn one completed or in-progress AI-assisted work unit into a comparable, evidence-based value assessment. A work unit can be a feature, bug fix, prototype, research pass, document revision, experiment, or short internal project.

## Evaluate

1. Define the smallest meaningful work unit. Split a broad initiative when its outcomes or costs cannot be assessed together.
2. Collect only the context already available or necessary to make the assessment: goal, output, evidence, AI cost, human effort, and any material other cost. Do not require token exports, model APIs, invoices, or a dollar estimate when they are unavailable.
3. Mark each non-trivial input as `observed`, `reported`, `estimated`, or `unknown`. Never present an estimate as an invoice or measured result.
4. Use the applicable 0–5 dimensions in [the rubric](references/rubric.md). Score from evidence; leave a dimension `null` when it does not fit the work unit.
5. Give a verdict:
   - `worth_it` — the delivered or likely value is well supported relative to cost.
   - `promising` — value is plausible, but decisive evidence is still missing.
   - `not_yet` — the work is too early to judge.
   - `not_worth_it` — available evidence shows a poor cost-to-value fit.
6. Compute monetary ROI only when the benefit estimate has a stated basis. Otherwise use a qualitative assessment; tokens alone are not a measure of value.

## Return

Return, in this order:

1. A short verdict with the strongest evidence and the biggest caveat.
2. A concise scorecard with only applicable dimensions.
3. One valid JSON object following [the output contract](references/output-contract.md).
4. The minimum next measurement or follow-up that could change the verdict, if one exists.

Keep the result candid and decision-useful. Do not invent a baseline, business value, adoption, or causal link between AI usage and outcome. When the record is incomplete, explain the uncertainty rather than forcing a precise ROI.

## References

- Read [references/rubric.md](references/rubric.md) when assigning value scores.
- Read [references/output-contract.md](references/output-contract.md) before producing the JSON record.
