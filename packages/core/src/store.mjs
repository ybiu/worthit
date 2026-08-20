import { mkdir, appendFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { nowIso } from "./schema.mjs";

export class JsonlStore {
  constructor(root = resolve("data")) {
    this.root = root;
    this.workUnitsPath = resolve(root, "work_units.jsonl");
    this.eventsPath = resolve(root, "events.jsonl");
    this.usagePath = resolve(root, "usage_events.jsonl");
    this.submissionsPath = resolve(root, "submissions.jsonl");
    this.conversationAnalysesPath = resolve(root, "conversation_analyses.jsonl");
  }

  async init() {
    await mkdir(this.root, { recursive: true });
  }

  async appendWorkUnit(workUnit) {
    await this.init();
    await appendFile(
      this.workUnitsPath,
      `${JSON.stringify(workUnit)}\n`,
      "utf8",
    );
    return workUnit;
  }

  async appendEvent(event) {
    await this.init();
    const record = {
      schema_version: "0.1",
      record_type: "event",
      id: event.id || `evt_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      timestamp: event.timestamp || nowIso(),
      ...event,
    };
    await appendFile(this.eventsPath, `${JSON.stringify(record)}\n`, "utf8");
    return record;
  }

  async appendUsage(records) {
    await this.init();
    const values = Array.isArray(records) ? records : [records];
    await appendFile(
      this.usagePath,
      values.map((record) => `${JSON.stringify(record)}\n`).join(""),
      "utf8",
    );
    return values;
  }

  async appendSubmission(submission) {
    await this.init();
    await appendFile(
      this.submissionsPath,
      `${JSON.stringify(submission)}\n`,
      "utf8",
    );
    return submission;
  }

  async appendConversationAnalysis(analysis) {
    await this.init();
    await appendFile(
      this.conversationAnalysesPath,
      `${JSON.stringify(analysis)}\n`,
      "utf8",
    );
    return analysis;
  }

  async listWorkUnits() {
    return readJsonl(this.workUnitsPath);
  }

  async listEvents() {
    return readJsonl(this.eventsPath);
  }

  async listUsage() {
    return readJsonl(this.usagePath);
  }

  async listSubmissions() {
    return readJsonl(this.submissionsPath);
  }

  async listConversationAnalyses() {
    return readJsonl(this.conversationAnalysesPath);
  }
}

async function readJsonl(path) {
  try {
    const content = await readFile(path, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
