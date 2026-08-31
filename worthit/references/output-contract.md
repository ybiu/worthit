# WorthIt output contract

Return one valid JSON object after the human-readable assessment. Use `null` for unavailable scalar values and record missing information instead of guessing.

```json
{
  "schema_version": "1.0",
  "verdict": "promising",
  "evaluation_source": "conversation_and_project",
  "work_unit": {
    "title": "",
    "scenario": "coding",
    "goal": "",
    "status": "in_progress",
    "starting_state": "",
    "ai_contribution": "",
    "human_contribution": ""
  },
  "conversation_trace": {
    "turns_considered": null,
    "iterations": null,
    "rework_or_blockers": [],
    "claims_from_conversation": []
  },
  "project_trace": {
    "workspace_or_repo": null,
    "files_or_artifacts_reviewed": [],
    "git_revision": null,
    "checks_run": [],
    "deployment_or_adoption_evidence": []
  },
  "evidence": [
    {
      "claim": "",
      "source": "reported",
      "reference": null
    }
  ],
  "costs": {
    "ai": {
      "usd": null,
      "tokens_in": null,
      "tokens_out": null,
      "models": [],
      "source": "unknown"
    },
    "human": {
      "hours": null,
      "usd": null,
      "source": "unknown"
    },
    "other_usd": null,
    "total_estimated_usd": null,
    "currency": "USD"
  },
  "value_scores": {
    "delivery_value": null,
    "practical_value": null,
    "quality_or_rigor": null,
    "novelty_or_insight": null,
    "adoption_confidence": null
  },
  "value_assessment": {
    "benefit_basis": "qualitative",
    "estimated_benefit_usd": null,
    "net_value_usd": null,
    "benefit_cost_ratio": null,
    "summary": ""
  },
  "meta": {
    "confidence_level": "medium",
    "assumptions": [],
    "missing_fields": [],
    "next_measurement": null
  }
}
```

## Field rules

- `scenario` is one of `coding`, `research`, `writing`, `prototype`, `ops`, or `mixed`.
- `evaluation_source` is one of `conversation`, `project`, `conversation_and_project`, or `imported_context`.
- `status` is one of `planned`, `in_progress`, `delivered`, `adopted`, or `stopped`.
- `conversation_trace` records what was actually visible in the Codex conversation; use `null` or an empty list when the source was not available.
- `project_trace` records concrete workspace/repository checks; do not list files or tests that were not inspected or run.
- `evidence[].source` and each cost `source` are `observed`, `reported`, `estimated`, or `unknown`.
- `benefit_basis` is `monetary` only when a stated, defensible benefit estimate is available; otherwise use `qualitative`.
- Set `net_value_usd` and `benefit_cost_ratio` only when both an estimated benefit and an estimated total cost are available.
- `verdict` is `worth_it`, `promising`, `not_yet`, or `not_worth_it`.
