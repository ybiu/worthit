import { nowIso } from "./schema.mjs";

export function createSubmission(type, payload, source = {}) {
  return {
    schema_version: "0.1",
    record_type: "submission",
    id: `sub_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    submission_type: type,
    submitted_at: nowIso(),
    source: {
      kind: source.kind || "user_submitted",
      confidence: source.confidence || "reported",
      ...source,
    },
    payload,
  };
}
