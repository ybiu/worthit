# Evaluator

This package turns work receipts and evidence into WorthIt verdicts, scorecards, and next measurements.

The evaluator treats `git`, `test`, `build`, `deploy`, `artifact`, and
`user_report` as outcome evidence. A delivery or feedback signal plus an
adoption confidence score of 3 or higher can produce `worth_it`; evidence with
an incomplete score remains `promising`, and activity without outcome evidence
remains `not_yet`. Missing evidence never becomes a zero value.
