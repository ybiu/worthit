export const SCHEMA_VERSION = "0.1";

export const SCENARIOS = [
  "coding",
  "research",
  "paper",
  "prototype",
  "ops",
  "mixed",
];

export const EVALUATION_MODES = ["mvp", "observational", "comparative"];

export const VALUE_DIMENSIONS = [
  "delivery_value",
  "practical_value",
  "quality_or_rigor",
  "novelty_or_insight",
  "adoption_confidence",
];

export function nowIso() {
  return new Date().toISOString();
}

export function createWorkUnit(input = {}) {
  const id = input.id || `wu_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const createdAt = input.created_at || nowIso();
  const aiCost = numberOrNull(input.costs?.ai_cost?.usd_cost);
  const humanHours = numberOrNull(input.costs?.human_cost?.human_hours);
  const hourlyUsd = numberOrNull(input.costs?.human_cost?.hourly_usd);
  const humanCost =
    numberOrNull(input.costs?.human_cost?.estimated_usd_cost) ??
    (humanHours !== null && hourlyUsd !== null ? humanHours * hourlyUsd : null);
  const otherCosts = numberOrNull(input.costs?.other_costs_usd) ?? 0;
  const totalCost =
    numberOrNull(input.costs?.total_estimated_cost_usd) ??
    (aiCost !== null || humanCost !== null
      ? (aiCost ?? 0) + (humanCost ?? 0) + otherCosts
      : null);

  return {
    schema_version: SCHEMA_VERSION,
    record_type: "work_unit",
    id,
    created_at: createdAt,
    updated_at: input.updated_at || createdAt,
    title: input.title || "Untitled work unit",
    scenario: input.scenario || "coding",
    evaluation_mode: input.evaluation_mode || "mvp",
    agent_stack: Array.isArray(input.agent_stack) ? input.agent_stack : [],
    owner: input.owner || null,
    team: input.team || null,
    goal: input.goal || "",
    time_window: {
      start: input.time_window?.start || null,
      end: input.time_window?.end || null,
      duration_hours: numberOrNull(input.time_window?.duration_hours),
    },
    costs: {
      ai_cost: {
        tokens_in: numberOrNull(input.costs?.ai_cost?.tokens_in),
        tokens_out: numberOrNull(input.costs?.ai_cost?.tokens_out),
        usd_cost: aiCost,
        source_quality: input.costs?.ai_cost?.source_quality || "unknown",
        models: Array.isArray(input.costs?.ai_cost?.models)
          ? input.costs.ai_cost.models
          : [],
      },
      human_cost: {
        human_hours: humanHours,
        hourly_usd: hourlyUsd,
        estimated_usd_cost: humanCost,
      },
      other_costs_usd: numberOrNull(input.costs?.other_costs_usd),
      total_estimated_cost_usd: totalCost,
    },
    outputs: {
      artifact_type: input.outputs?.artifact_type || "",
      artifact_summary: input.outputs?.artifact_summary || "",
      evidence: Array.isArray(input.outputs?.evidence)
        ? input.outputs.evidence
        : [],
      status: input.outputs?.status || "draft",
    },
    value_scores: Object.fromEntries(
      VALUE_DIMENSIONS.map((key) => [key, numberOrNull(input.value_scores?.[key])]),
    ),
    value_summary: {
      estimated_benefits: Array.isArray(input.value_summary?.estimated_benefits)
        ? input.value_summary.estimated_benefits
        : [],
      risks_or_limits: Array.isArray(input.value_summary?.risks_or_limits)
        ? input.value_summary.risks_or_limits
        : [],
      overall_value_thesis: input.value_summary?.overall_value_thesis || "",
    },
    roi_snapshot: {
      roi_mode: input.roi_snapshot?.roi_mode || "qualitative",
      estimated_value_usd: numberOrNull(
        input.roi_snapshot?.estimated_value_usd,
      ),
      net_value_usd: numberOrNull(input.roi_snapshot?.net_value_usd),
      benefit_cost_ratio: numberOrNull(
        input.roi_snapshot?.benefit_cost_ratio,
      ),
    },
    meta: {
      confidence_level: input.meta?.confidence_level || "medium",
      assumptions: Array.isArray(input.meta?.assumptions)
        ? input.meta.assumptions
        : [],
      missing_fields: Array.isArray(input.meta?.missing_fields)
        ? input.meta.missing_fields
        : [],
    },
  };
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
