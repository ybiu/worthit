import { VALUE_DIMENSIONS } from "./schema.mjs";

export function calculateTotalCost(workUnit) {
  if (typeof workUnit.costs?.total_estimated_cost_usd === "number") {
    return round(workUnit.costs.total_estimated_cost_usd);
  }
  const ai = workUnit.costs?.ai_cost?.usd_cost ?? 0;
  const human =
    workUnit.costs?.human_cost?.estimated_usd_cost ??
    (workUnit.costs?.human_cost?.human_hours ?? 0) *
      (workUnit.costs?.human_cost?.hourly_usd ?? 0);
  const other = workUnit.costs?.other_costs_usd ?? 0;
  return round(ai + human + other);
}

export function calculateValueScore(workUnit) {
  const scores = VALUE_DIMENSIONS.map((key) => workUnit.value_scores?.[key])
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!scores.length) return null;
  return round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 2);
}

export function enrichMetrics(workUnit) {
  const totalCost = calculateTotalCost(workUnit);
  const valueScore = calculateValueScore(workUnit);
  const estimatedValue = workUnit.roi_snapshot?.estimated_value_usd;

  return {
    ...workUnit,
    metrics: {
      total_cost_usd: totalCost,
      value_score_0_to_5: valueScore,
      cost_per_value_point_usd:
        valueScore && valueScore > 0 ? round(totalCost / valueScore, 2) : null,
      net_value_usd:
        typeof estimatedValue === "number"
          ? round(estimatedValue - totalCost, 2)
          : null,
    },
  };
}

export function summarizeWorkUnits(workUnits) {
  const enriched = workUnits.map(enrichMetrics);
  const totalCost = enriched.reduce(
    (sum, item) => sum + (item.metrics.total_cost_usd || 0),
    0,
  );
  const scored = enriched.filter(
    (item) => typeof item.metrics.value_score_0_to_5 === "number",
  );

  return {
    work_unit_count: enriched.length,
    total_cost_usd: round(totalCost),
    average_value_score_0_to_5: scored.length
      ? round(
          scored.reduce(
            (sum, item) => sum + item.metrics.value_score_0_to_5,
            0,
          ) / scored.length,
          2,
        )
      : null,
    by_agent: groupByAgent(enriched),
    by_scenario: groupBy(enriched, (item) => item.scenario),
  };
}

function groupByAgent(items) {
  const grouped = {};
  for (const item of items) {
    for (const agent of item.agent_stack?.length ? item.agent_stack : ["unknown"]) {
      grouped[agent] ||= { work_units: 0, total_cost_usd: 0, value_scores: [] };
      grouped[agent].work_units += 1;
      grouped[agent].total_cost_usd += item.metrics.total_cost_usd || 0;
      if (item.metrics.value_score_0_to_5 !== null) {
        grouped[agent].value_scores.push(item.metrics.value_score_0_to_5);
      }
    }
  }
  return finalizeGroups(grouped);
}

function groupBy(items, getKey) {
  const grouped = {};
  for (const item of items) {
    const key = getKey(item);
    grouped[key] ||= { work_units: 0, total_cost_usd: 0, value_scores: [] };
    grouped[key].work_units += 1;
    grouped[key].total_cost_usd += item.metrics.total_cost_usd || 0;
    if (item.metrics.value_score_0_to_5 !== null) {
      grouped[key].value_scores.push(item.metrics.value_score_0_to_5);
    }
  }
  return finalizeGroups(grouped);
}

function finalizeGroups(groups) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [
      key,
      {
        work_units: value.work_units,
        total_cost_usd: round(value.total_cost_usd),
        average_value_score_0_to_5: value.value_scores.length
          ? round(
              value.value_scores.reduce((sum, score) => sum + score, 0) /
                value.value_scores.length,
              2,
            )
          : null,
      },
    ]),
  );
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
