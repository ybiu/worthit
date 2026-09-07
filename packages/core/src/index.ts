export type Provider = 'codex' | 'claude' | 'cursor' | 'gemini' | 'other';
export type EvidenceSource = 'observed' | 'reported' | 'estimated' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';

/** A normalized model-call usage fact. It is deliberately provider-neutral. */
export type UsageRecord = {
  id: string;
  timestamp: string;
  provider: Provider;
  model: string;
  project?: string;
  task?: string;
  sessionId?: string;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  source: EvidenceSource;
};

export type ModelPrice = {
  model: string;
  inputPerMillion: number;
  cachedInputPerMillion: number;
  cacheWritePerMillion: number;
  outputPerMillion: number;
  effectiveDate: string;
};

export type CostBreakdown = {
  input: number | null;
  cachedInput: number | null;
  cacheWrite: number | null;
  output: number | null;
  total: number | null;
  currency: string;
  source: EvidenceSource;
  model?: string;
};

export type EvidenceKind = 'test' | 'build' | 'git' | 'deploy' | 'artifact' | 'user_report' | 'agent_claim';

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  source: EvidenceSource;
  confidence: Confidence;
  summary: string;
  timestamp?: string;
  details?: string;
};

export type WorkStatus = 'complete' | 'in_progress' | 'blocked';
export type Verdict = 'worth_it' | 'promising' | 'not_yet' | 'not_worth_it';

export type HumanCost = {
  minutes: number;
  hourlyRate: number | null;
  total: number | null;
  currency: string;
  source: EvidenceSource;
};

export type OtherCost = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  source: EvidenceSource;
  notes?: string;
};

export type ValueScores = Partial<Record<'deliveryValue' | 'practicalValue' | 'qualityOrRigor' | 'noveltyOrInsight' | 'adoptionConfidence', number>>;

export type WorkUnit = {
  id: string;
  title: string;
  goal?: string;
  status: WorkStatus;
  usageRecordIds: string[];
  evidenceIds: string[];
  createdAt: string;
  humanCost?: HumanCost;
  otherCosts?: OtherCost[];
};

export type WorkReceipt = {
  id: string;
  workUnitId: string;
  title: string;
  status: WorkStatus;
  records: UsageRecord[];
  evidence: EvidenceItem[];
  filesTouched: string[];
  checks: string[];
  valueScores?: ValueScores;
  humanCost?: HumanCost;
  otherCosts?: OtherCost[];
  verdict: Verdict;
  verdictReason: string;
  confidence: Confidence;
  nextMeasurement: string;
};
