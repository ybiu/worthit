import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { nowIso } from "./schema.mjs";

export const DEFAULT_PRICING = {
  // Keep pricing user-configurable. Provider prices change over time.
  currency: "USD",
  models: {},
};

export async function discoverCodexUsage(root) {
  const files = await findJsonlFiles(
    root || resolve(process.env.USERPROFILE || ".", ".codex", "sessions"),
  );
  const records = [];
  for (const file of files) {
    const record = await parseCodexSession(file);
    if (record) records.push(record);
  }
  return records;
}

export async function importUsageJsonl(file, agent) {
  const content = await readFile(resolve(file), "utf8");
  const records = [];
  for (const line of content.split(/\r?\n/).filter(Boolean)) {
    const value = JSON.parse(line);
    const usage = findUsage(value);
    if (!usage) continue;
    records.push({
      record_type: "usage_event",
      schema_version: "0.1",
      id: `usage_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      agent,
      timestamp: value.timestamp || nowIso(),
      source: {
        kind: "imported_file",
        path: resolve(file),
        confidence: "reported",
      },
      model: value.model || value.payload?.model || null,
      usage,
    });
  }
  return records;
}

export function calculateUsageCost(usage, pricing = DEFAULT_PRICING) {
  const modelPrice = pricing.models?.[usage.model];
  if (!modelPrice) {
    return {
      usd_cost: null,
      pricing_status: "missing_model_price",
      pricing_source: null,
    };
  }

  const input = (usage.input_tokens || 0) / 1_000_000;
  const output = (usage.output_tokens || 0) / 1_000_000;
  const cached = (usage.cached_input_tokens || 0) / 1_000_000;
  const cost =
    input * (modelPrice.input_per_million || 0) +
    output * (modelPrice.output_per_million || 0) +
    cached * (modelPrice.cached_input_per_million || 0);

  return {
    usd_cost: round(cost, 8),
    pricing_status: "calculated",
    pricing_source: pricing.source || "user_submitted_pricing",
  };
}

function findUsage(value) {
  const info = value?.payload?.info || value?.info || value?.usage || value;
  if (!info || typeof info !== "object") return null;
  const usage =
    info.last_token_usage ||
    info.usage ||
    (info.input_tokens !== undefined || info.output_tokens !== undefined
      ? info
      : null);
  if (!usage) return null;
  return normalizeUsage(usage);
}

function normalizeUsage(usage) {
  return {
    input_tokens: numberOrZero(
      usage.input_tokens ?? usage.prompt_tokens ?? usage.input,
    ),
    output_tokens: numberOrZero(
      usage.output_tokens ?? usage.completion_tokens ?? usage.output,
    ),
    cached_input_tokens: numberOrZero(
      usage.cached_input_tokens ?? usage.cache_read_input_tokens,
    ),
    reasoning_output_tokens: numberOrZero(usage.reasoning_output_tokens),
    total_tokens: numberOrZero(usage.total_tokens),
  };
}

async function parseCodexSession(file) {
  const content = await readFile(file, "utf8");
  let sessionId = null;
  let model = null;
  let latest = null;
  let latestTimestamp = null;

  for (const line of content.split(/\r?\n/).filter(Boolean)) {
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = value.payload || {};
    if (value.type === "session_meta") {
      sessionId = payload.session_id || payload.id || sessionId;
      model =
        payload.model ||
        payload.model_name ||
        payload.model_provider ||
        model;
    }
    if (value.type === "turn_context") {
      model = payload.model || model;
    }
    const usage = payload.info?.total_token_usage;
    if (usage) {
      latest = normalizeUsage(usage);
      latestTimestamp = value.timestamp || latestTimestamp;
    }
  }

  if (!latest) return null;
  return {
    record_type: "usage_event",
    schema_version: "0.1",
    id: `usage_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    agent: "codex",
    session_id: sessionId,
    timestamp: latestTimestamp || nowIso(),
    source: {
      kind: "local_session_log",
      path: resolve(file),
      confidence: "reported",
    },
    model,
    usage: latest,
  };
}

async function findJsonlFiles(root) {
  const files = [];
  await walk(resolve(root), files);
  return files.filter((file) => extname(file).toLowerCase() === ".jsonl");
}

async function walk(root, files) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) await walk(path, files);
    else if (entry.isFile()) files.push(path);
  }
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
