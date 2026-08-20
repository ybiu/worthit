#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  JsonlStore,
  createWorkUnit,
  enrichMetrics,
  summarizeWorkUnits,
  SCENARIOS,
  EVALUATION_MODES,
  discoverCodexUsage,
  importUsageJsonl,
  createSubmission,
  calculateUsageCost,
} from "../../../packages/core/src/index.mjs";

const store = new JsonlStore(resolve(process.env.WORTHIT_DATA_DIR || "data"));
const [command = "help", ...args] = process.argv.slice(2);

try {
  if (command === "init") {
    await store.init();
    print({ ok: true, data_dir: store.root });
  } else if (command === "add") {
    await addWorkUnit(args);
  } else if (command === "list") {
    print(await store.listWorkUnits());
  } else if (command === "analyze") {
    print(summarizeWorkUnits(await store.listWorkUnits()));
  } else if (command === "validate") {
    await validate();
  } else if (command === "discover") {
    await discover(args);
  } else if (command === "import-usage") {
    await importUsage(args);
  } else if (command === "submit") {
    await submit(args);
  } else if (command === "cost-usage") {
    await costUsage(args);
  } else {
    printHelp();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function addWorkUnit(args) {
  const fileIndex = args.indexOf("--file");
  if (fileIndex === -1 || !args[fileIndex + 1]) {
    throw new Error("Usage: npm run worthit -- add --file path/to/evaluation.json");
  }
  const input = JSON.parse(await readFile(resolve(args[fileIndex + 1]), "utf8"));
  const workUnit = createWorkUnit(input);
  const enriched = enrichMetrics(workUnit);
  await store.appendWorkUnit(enriched);
  print(enriched);
}

async function validate() {
  const errors = [];
  const units = await store.listWorkUnits();
  for (const unit of units) {
    if (!unit.id) errors.push("work unit is missing id");
    if (!SCENARIOS.includes(unit.scenario)) {
      errors.push(`${unit.id}: invalid scenario ${unit.scenario}`);
    }
    if (!EVALUATION_MODES.includes(unit.evaluation_mode)) {
      errors.push(`${unit.id}: invalid evaluation_mode ${unit.evaluation_mode}`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  print({ ok: true, work_unit_count: units.length });
}

async function discover(args) {
  const agent = args[0] || "codex";
  const pathIndex = args.indexOf("--path");
  const path = pathIndex >= 0 ? args[pathIndex + 1] : undefined;
  if (agent !== "codex") {
    throw new Error("Automatic discovery currently supports codex. Use import-usage for Claude Code exports.");
  }
  const records = await discoverCodexUsage(path);
  if (args.includes("--save")) await store.appendUsage(records);
  print({
    agent,
    count: records.length,
    saved: args.includes("--save"),
    records,
  });
}

async function importUsage(args) {
  const agent = args[0];
  const fileIndex = args.indexOf("--file");
  if (!agent || fileIndex === -1 || !args[fileIndex + 1]) {
    throw new Error("Usage: import-usage <agent> --file path/to/usage.jsonl");
  }
  const records = await importUsageJsonl(args[fileIndex + 1], agent);
  await store.appendUsage(records);
  print({ agent, count: records.length, saved: true, records });
}

async function submit(args) {
  const type = args[0];
  const fileIndex = args.indexOf("--file");
  if (!type || fileIndex === -1 || !args[fileIndex + 1]) {
    throw new Error("Usage: submit <billing|pricing|human-cost|outcome> --file path/to/submission.json");
  }
  const payload = JSON.parse(
    await readFile(resolve(args[fileIndex + 1]), "utf8"),
  );
  const submission = createSubmission(type, payload, {
    kind: "user_submitted_file",
    path: resolve(args[fileIndex + 1]),
  });
  await store.appendSubmission(submission);
  print(submission);
}

async function costUsage(args) {
  const fileIndex = args.indexOf("--pricing");
  if (fileIndex === -1 || !args[fileIndex + 1]) {
    throw new Error("Usage: cost-usage --pricing path/to/pricing.json");
  }
  const pricing = JSON.parse(
    await readFile(resolve(args[fileIndex + 1]), "utf8"),
  );
  const records = await store.listUsage();
  const priced = records.map((record) => ({
    ...record,
    cost: calculateUsageCost(
      { ...record.usage, model: record.model },
      pricing,
    ),
  }));
  print({
    usage_event_count: priced.length,
    total_calculated_usd: round(
      priced.reduce((sum, record) => sum + (record.cost.usd_cost || 0), 0),
      8,
    ),
    records: priced,
  });
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`WorthIt local-first CLI

Commands:
  init                              Initialize the local data directory
  add --file <path>                 Add a structured work-unit evaluation
  list                              List stored work units
  analyze                           Calculate cost/value summaries
  validate                          Validate stored records
  discover codex [--path <dir>]     Discover local Codex token usage
  import-usage <agent> --file <path> Import agent usage JSONL
  submit <type> --file <path>       Submit billing, pricing, human-cost, or outcome data
  cost-usage --pricing <path>       Calculate usage cost from a pricing table

Environment:
  WORTHIT_DATA_DIR                  Override the default data directory`);
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
