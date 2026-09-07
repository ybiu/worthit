import type { Confidence, EvidenceItem, Verdict, WorkReceipt } from '@worthit/core';

export function evaluateReceipt(receipt: Pick<WorkReceipt, 'status' | 'evidence' | 'valueScores'>): { verdict: Verdict; confidence: Confidence; reason: string; nextMeasurement: string } {
  const evidence = receipt.evidence || [];
  const hasOutcomeEvidence = evidence.some((item) => ['test', 'build', 'deploy', 'artifact', 'git', 'user_report'].includes(item.kind));
  const hasAdoption = (receipt.valueScores?.adoptionConfidence ?? 0) >= 3;
  const hasStrongScore = Object.values(receipt.valueScores || {}).filter((score) => typeof score === 'number').length > 0;
  if (receipt.status === 'blocked') return { verdict: 'not_yet', confidence: 'medium', reason: '工作单元仍被阻塞，尚无足够交付证据。', nextMeasurement: '记录阻塞解除条件，并重新运行最小验证。' };
  if (hasOutcomeEvidence && hasAdoption) return { verdict: 'worth_it', confidence: 'high', reason: '已有交付或用户反馈证据，且存在采用或实际使用信号。', nextMeasurement: '记录一周后的持续使用、回滚或维护成本。' };
  if (hasOutcomeEvidence && hasStrongScore) return { verdict: 'promising', confidence: 'medium', reason: '已有交付或用户反馈证据，但实际采用或长期收益仍未验证。', nextMeasurement: '确认产物是否被合并、部署或被目标用户持续使用。' };
  return { verdict: 'not_yet', confidence: evidence.length ? 'low' : 'low', reason: '成本可以估算，但缺少足以证明价值的交付或采用证据。', nextMeasurement: '补充一个可核验的测试、交付、部署或用户采用信号。' };
}
