import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Confidence, EvidenceItem, EvidenceKind, HumanCost, OtherCost, UsageRecord, WorkReceipt, WorkStatus } from '@worthit/core';
import { summarize, recordCost } from '@worthit/analytics';
import { collectCodexJsonl } from '@worthit/collectors';
import { evaluateReceipt } from '@worthit/evaluator';
import { loadState, mergeUsage, resetState, saveState, type WorthItState } from '@worthit/storage';
import './styles.css';

const number = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const money = (value: number | null) => value === null ? '未知' : `$${value.toFixed(2)}`;
const trackedMoney = (tracked: boolean, value: number | null) => tracked ? money(value) : '未记录';
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function App() {
  const [state, setState] = useState<WorthItState>(() => loadState());
  const [notice, setNotice] = useState('');
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [status, setStatus] = useState<WorkStatus>('in_progress');
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('git');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [evidenceDetails, setEvidenceDetails] = useState('');
  const [evidenceConfidence, setEvidenceConfidence] = useState<Confidence>('medium');
  const [humanMinutes, setHumanMinutes] = useState('');
  const [humanRate, setHumanRate] = useState('');
  const [otherCostLabel, setOtherCostLabel] = useState('');
  const [otherCostAmount, setOtherCostAmount] = useState('');
  const [adoptionScore, setAdoptionScore] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => summarize(state.usage), [state.usage]);
  const latestReceipt = state.receipts[0];
  const selectedReceipt = state.receipts.find((receipt) => receipt.workUnitId === selectedWorkUnitId) || latestReceipt;
  const selectedUnit = state.workUnits.find((unit) => unit.id === selectedReceipt?.workUnitId);
  const activeUnits = state.workUnits.filter((unit) => unit.status !== 'complete').length;
  const verified = state.evidence.filter((item) => ['test', 'build', 'deploy'].includes(item.kind)).length;
  const humanUnits = state.workUnits.map((unit) => unit.humanCost).filter((cost): cost is HumanCost => Boolean(cost));
  const humanCostUnknown = humanUnits.some((cost) => cost.total === null);
  const humanCostTotal = humanCostUnknown ? null : humanUnits.reduce((total, cost) => total + (cost.total || 0), 0);
  const otherCosts = state.workUnits.flatMap((unit) => unit.otherCosts || []);
  const otherCostTotal = otherCosts.reduce((total, cost) => total + cost.amount, 0);

  useEffect(() => {
    if (!selectedWorkUnitId && latestReceipt) setSelectedWorkUnitId(latestReceipt.workUnitId);
  }, [latestReceipt, selectedWorkUnitId]);

  useEffect(() => {
    if (!selectedUnit) return;
    setTitle(selectedUnit.title);
    setGoal(selectedUnit.goal || '');
    setStatus(selectedUnit.status);
    const currentReceipt = state.receipts.find((receipt) => receipt.workUnitId === selectedUnit.id);
    setAdoptionScore(currentReceipt?.valueScores?.adoptionConfidence === undefined ? '' : String(currentReceipt.valueScores.adoptionConfidence));
    setHumanMinutes(selectedUnit.humanCost ? String(selectedUnit.humanCost.minutes) : '');
    setHumanRate(selectedUnit.humanCost?.hourlyRate === null || selectedUnit.humanCost?.hourlyRate === undefined ? '' : String(selectedUnit.humanCost.hourlyRate));
  }, [selectedWorkUnitId]);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const imported: UsageRecord[] = [];
    const evidence: EvidenceItem[] = [];
    for (const file of Array.from(files)) {
      const records = collectCodexJsonl(await file.text(), file.name);
      imported.push(...records);
      evidence.push({ id: makeId('evidence'), kind: 'agent_claim', source: 'observed', confidence: 'medium', summary: `从 ${file.name} 观察到 Codex 用量记录`, timestamp: new Date().toISOString(), details: '该证据证明发生过 AI 活动，但不证明交付价值。' });
    }
    const nextState = mergeUsage(state, imported);
    const added = nextState.usage.filter((record) => !state.usage.some((old) => old.id === record.id));
    const workUnitId = makeId('work');
    const work = { id: workUnitId, title: 'Imported Codex activity', goal: 'Review the value of an AI-assisted work unit', status: 'in_progress' as const, usageRecordIds: added.map((record) => record.id), evidenceIds: evidence.map((item) => item.id), createdAt: new Date().toISOString() };
    const decision = evaluateReceipt({ status: work.status, evidence });
    const receipt: WorkReceipt = { id: makeId('receipt'), workUnitId, title: work.title, status: work.status, records: added, evidence, filesTouched: [], checks: [], verdict: decision.verdict, verdictReason: decision.reason, confidence: decision.confidence, nextMeasurement: decision.nextMeasurement };
    const saved = { ...nextState, evidence: [...state.evidence, ...evidence], workUnits: [work, ...state.workUnits], receipts: [receipt, ...state.receipts] };
    saveState(saved);
    setState(saved);
    setSelectedWorkUnitId(workUnitId);
    setNotice(`${added.length} 条新用量记录已导入${imported.length !== added.length ? `，跳过 ${imported.length - added.length} 条重复记录` : ''}`);
  }

  function saveWorkReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUnit || !selectedReceipt) {
      setNotice('请先导入活动，创建一个 Work Unit。');
      return;
    }
    if (!evidenceSummary.trim()) {
      setNotice('请填写证据摘要。');
      return;
    }
    const minutes = humanMinutes.trim() === '' ? null : Number(humanMinutes);
    const hourlyRate = humanRate.trim() === '' ? null : Number(humanRate);
    if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0)) {
      setNotice('人工时间必须是大于等于 0 的数字。');
      return;
    }
    if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) {
      setNotice('时薪必须是大于等于 0 的数字。');
      return;
    }
    const parsedAdoption = adoptionScore.trim() === '' ? null : Number(adoptionScore);
    if (parsedAdoption !== null && (!Number.isFinite(parsedAdoption) || parsedAdoption < 0 || parsedAdoption > 5)) {
      setNotice('采用 / 反馈信心必须是 0 到 5 之间的数字。');
      return;
    }
    const otherAmount = otherCostAmount.trim() === '' ? null : Number(otherCostAmount);
    if ((otherCostLabel.trim() || otherCostAmount.trim()) && (!otherCostLabel.trim() || otherAmount === null || !Number.isFinite(otherAmount) || otherAmount < 0)) {
      setNotice('其他成本需要同时填写名称和有效金额。');
      return;
    }
    const now = new Date().toISOString();
    const item: EvidenceItem = {
      id: makeId('evidence'),
      kind: evidenceKind,
      source: 'reported',
      confidence: evidenceConfidence,
      summary: evidenceSummary.trim(),
      timestamp: now,
      details: evidenceDetails.trim() || undefined,
    };
    const humanCost: HumanCost | undefined = minutes === null ? undefined : {
      minutes,
      hourlyRate,
      total: hourlyRate === null ? null : minutes / 60 * hourlyRate,
      currency: 'USD',
      source: 'reported',
    };
    const addedOtherCost: OtherCost | undefined = otherAmount === null ? undefined : {
      id: makeId('cost'),
      label: otherCostLabel.trim(),
      amount: otherAmount,
      currency: 'USD',
      source: 'reported',
    };
    const nextOtherCosts = addedOtherCost ? [...(selectedUnit.otherCosts || []), addedOtherCost] : (selectedUnit.otherCosts || []);
    const nextEvidenceIds = [...selectedUnit.evidenceIds, item.id];
    const nextUnit = {
      ...selectedUnit,
      title: title.trim() || selectedUnit.title,
      goal: goal.trim() || undefined,
      status,
      evidenceIds: nextEvidenceIds,
      humanCost,
      otherCosts: nextOtherCosts,
    };
    const valueScores = adoptionScore.trim() === ''
      ? selectedReceipt.valueScores
      : { ...selectedReceipt.valueScores, adoptionConfidence: parsedAdoption as number };
    const evidence = [...state.evidence, item].filter((candidate) => nextUnit.evidenceIds.includes(candidate.id));
    const decision = evaluateReceipt({ status, evidence, valueScores });
    const nextReceipt: WorkReceipt = {
      ...selectedReceipt,
      title: nextUnit.title,
      status,
      records: state.usage.filter((record) => nextUnit.usageRecordIds.includes(record.id)),
      evidence,
      valueScores,
      humanCost,
      otherCosts: nextOtherCosts,
      verdict: decision.verdict,
      verdictReason: decision.reason,
      confidence: decision.confidence,
      nextMeasurement: decision.nextMeasurement,
    };
    const saved: WorthItState = {
      ...state,
      evidence: [...state.evidence, item],
      workUnits: state.workUnits.map((unit) => unit.id === nextUnit.id ? nextUnit : unit),
      receipts: state.receipts.map((receipt) => receipt.id === nextReceipt.id ? nextReceipt : receipt),
    };
    saveState(saved);
    setState(saved);
    setEvidenceSummary('');
    setEvidenceDetails('');
    setOtherCostLabel('');
    setOtherCostAmount('');
    setNotice('Work Unit、证据和 Work Receipt 已更新，并重新评估。');
  }

  function clear() {
    const cleared = resetState();
    setState(cleared);
    setNotice('本地账本已清空');
  }

  return <main>
    <header className="topbar">
      <div><p className="eyebrow">WORTHIT / AI WORK LEDGER</p><h1>知道 AI 工作花了什么，才知道它是否值得。</h1><p className="lede">本地优先的 AI 工作账本：把 Token、成本、工作单元和交付证据放在同一张可追溯的凭证里。</p></div>
      <div className="actions"><button onClick={() => inputRef.current?.click()}>＋ 导入 Codex 日志</button><input ref={inputRef} type="file" accept=".jsonl,.json,text/*" multiple hidden onChange={(event) => { void importFiles(event.target.files); event.target.value = ''; }} /><button className="text-button" onClick={clear}>清空本地数据</button></div>
    </header>
    <nav><a className="active">概览</a><a>活动</a><a>工作凭证</a><a>洞察</a></nav>
    {notice && <div className="notice" role="status">{notice}</div>}
    <section className="hero-grid">
      <article className="hero-card"><span>API 等价成本 · 当前账本</span><strong>{money(summary.cost)}</strong><small>{summary.unknownCostRecords ? `${summary.unknownCostRecords} 条记录缺少可匹配价格` : '基于带日期的公开价格估算，不是账单'}</small></article>
      <article className="hero-card light"><span>AI tokens · 当前账本</span><strong>{number(summary.total)}</strong><small>输入 {number(summary.input)} · 缓存 {number(summary.cached)} · 输出 {number(summary.output)}</small></article>
      <article className="hero-card light"><span>待评估工作单元</span><strong>{activeUnits}</strong><small>{verified} 条交付相关证据已记录</small></article>
    </section>
    <section className="content-grid">
      <article className="panel wide"><div className="panel-head"><div><h2>近期活动</h2><p>每条记录都保留 Provider、模型、Session 和来源质量。</p></div><span className="tag">{state.usage.length ? `${state.usage.length} 条记录` : '等待导入'}</span></div>{state.usage.length ? <div className="table-wrap"><table><thead><tr><th>日期</th><th>工具</th><th>模型</th><th>项目</th><th>Tokens</th><th>成本</th></tr></thead><tbody>{state.usage.slice(-8).reverse().map((record) => { const cost = recordCost(record); return <tr key={record.id}><td>{date(record.timestamp)}</td><td>{record.provider}</td><td>{record.model}</td><td>{record.project || '未知'}</td><td>{number(record.inputTokens + record.cachedInputTokens + record.cacheWriteTokens + record.outputTokens)}</td><td className="money">{money(cost.total)} <small className="source">{cost.source === 'estimated' ? '估算' : '未知'}</small></td></tr>; })}</tbody></table></div> : <div className="empty">导入一个或多个 Codex `rollout-*.jsonl` 文件，开始建立本地账本。</div>}</article>
      <article className="panel receipt"><div className="panel-head"><div><h2>WorthIt 信号</h2><p>结论只使用目前账本中已有的证据。</p></div><span className={`verdict ${selectedReceipt?.verdict || 'not_yet'}`}>{selectedReceipt ? ({ worth_it: '值得', promising: '有希望', not_yet: '尚未判断', not_worth_it: '不值得' }[selectedReceipt.verdict]) : '尚未判断'}</span></div><p className="signal">{selectedReceipt?.confidence === 'high' ? '证据充分' : selectedReceipt ? '证据仍不完整' : '等待工作证据'}</p><p className="muted">{selectedReceipt?.verdictReason || 'Token 只能说明成本，不能单独证明价值。请先导入活动，再补充测试、交付或采用证据。'}</p><div className="receipt-meta"><span>工作凭证</span><strong>{selectedReceipt ? selectedReceipt.title : '暂无'}</strong><span>下一步</span><strong>{selectedReceipt?.nextMeasurement || '记录一个可核验的结果信号'}</strong></div></article>
    </section>
    <section className="cost-panel"><div><span>AI API 等价成本</span><strong>{money(summary.cost)}</strong><small>估算，不是订阅账单</small></div><div><span>人工成本</span><strong>{trackedMoney(humanUnits.length > 0, humanCostTotal)}</strong><small>{humanUnits.length ? `${number(humanUnits.reduce((total, cost) => total + cost.minutes, 0))} 分钟${humanCostUnknown ? ' · 缺少时薪' : ''}` : '尚未记录'}</small></div><div><span>其他成本</span><strong>{trackedMoney(otherCosts.length > 0, otherCostTotal)}</strong><small>{otherCosts.length ? `${otherCosts.length} 项用户报告成本` : '尚未记录'}</small></div></section>
    <section className="panel editor"><div className="panel-head"><div><h2>补充 Work Unit 证据</h2><p>把 Git diff、测试、构建、部署或用户反馈记录为可追溯证据。</p></div><span className="tag">{selectedUnit ? '可编辑' : '等待导入'}</span></div>{selectedUnit ? <form onSubmit={saveWorkReceipt}><label>工作单元<select value={selectedUnit.id} onChange={(event) => setSelectedWorkUnitId(event.target.value)}>{state.workUnits.map((unit) => <option value={unit.id} key={unit.id}>{unit.title}</option>)}</select></label><div className="form-grid"><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>状态<select value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)}><option value="in_progress">进行中</option><option value="complete">已完成</option><option value="blocked">已阻塞</option></select></label></div><label>目标<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="这个 Work Unit 要完成什么？" /></label><div className="form-grid"><label>证据类型<select value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as EvidenceKind)}><option value="git">Git diff</option><option value="test">测试结果</option><option value="build">构建结果</option><option value="deploy">部署信息</option><option value="user_report">用户采用 / 反馈</option><option value="artifact">产物</option><option value="agent_claim">Agent 声明</option></select></label><label>可信度<select value={evidenceConfidence} onChange={(event) => setEvidenceConfidence(event.target.value as Confidence)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label></div><label>证据摘要<input value={evidenceSummary} onChange={(event) => setEvidenceSummary(event.target.value)} placeholder="例如：npm run build 通过，产出 dist/" /></label><label>详情 / 链接 / 命令<textarea value={evidenceDetails} onChange={(event) => setEvidenceDetails(event.target.value)} placeholder="例如：git diff --stat；测试 18 passed；部署 URL 或用户原话" rows={3} /></label><div className="form-grid"><label>人工时间（分钟）<input type="number" min="0" step="1" value={humanMinutes} onChange={(event) => setHumanMinutes(event.target.value)} placeholder="未记录可留空" /></label><label>人工时薪（USD / 小时）<input type="number" min="0" step="0.01" value={humanRate} onChange={(event) => setHumanRate(event.target.value)} placeholder="留空则成本未知" /></label></div><div className="form-grid"><label>其他成本名称<input value={otherCostLabel} onChange={(event) => setOtherCostLabel(event.target.value)} placeholder="例如：CI、云资源、外包" /></label><label>其他成本（USD）<input type="number" min="0" step="0.01" value={otherCostAmount} onChange={(event) => setOtherCostAmount(event.target.value)} placeholder="明确金额后才计入" /></label></div><label>采用 / 反馈信心（0–5）<input type="number" min="0" max="5" step="1" value={adoptionScore} onChange={(event) => setAdoptionScore(event.target.value)} placeholder="达到 3 才会形成 worth_it 信号" /></label><button className="save-button" type="submit">保存证据并重新评估</button></form> : <div className="empty">导入 Codex 日志后，这里可以编辑 Work Unit 并补充证据。</div>}</section>
    <section className="panel evidence-panel"><div className="panel-head"><div><h2>当前证据</h2><p>用户报告的成本与结果会保留来源和可信度。</p></div><span className="tag">{selectedReceipt?.evidence.length || 0} 条</span></div>{selectedReceipt?.evidence.length ? <div className="evidence-list">{selectedReceipt.evidence.slice().reverse().map((item) => <div className="evidence-item" key={item.id}><span className={`evidence-kind ${item.kind}`}>{({ git: 'Git', test: '测试', build: '构建', deploy: '部署', user_report: '用户', artifact: '产物', agent_claim: 'Agent' }[item.kind])}</span><div><strong>{item.summary}</strong><p>{item.details || '未提供详情'}</p></div><small>{item.source} · {item.confidence}</small></div>)}</div> : <div className="empty">还没有工作证据。</div>}</section>
    <section className="insights"><h2>值得关注的信号</h2><div className="signal-grid"><div><b>成本诚实性</b><span>{summary.cost === null ? '存在未定价模型，成本显示为未知。' : '所有已导入记录均可按当前价格表估算。'}</span></div><div><b>工作单元</b><span>{activeUnits ? `${activeUnits} 个工作单元尚未完成价值判断。` : '导入日志后自动创建待评估工作凭证。'}</span></div><div><b>下一次测量</b><span>{latestReceipt?.nextMeasurement || '最小动作：导入日志并补充一条交付证据。'}</span></div></div></section>
    <footer>Local-first · 不上传提示词、凭据或原始会话内容 · 估算值与未知值不会伪装成账单</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
