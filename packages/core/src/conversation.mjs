const ROLE_PATTERNS = [
  { role: "user", patterns: [/^(user|human|用户|我)\s*[:：]/i] },
  { role: "assistant", patterns: [/^(assistant|ai|bot|claude|codex|助手)\s*[:：]/i] },
];

export function parseConversation(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => ({
        role: normalizeRole(item.role || item.author || item.speaker),
        content: String(item.content || item.text || "").trim(),
      }))
      .filter((item) => item.content);
  }

  const text = String(input || "").replaceAll("\\n", "\n").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const messages = [];
  let current = null;

  for (const line of lines) {
    const match = ROLE_PATTERNS.flatMap((item) =>
      item.patterns.map((pattern) => ({ role: item.role, match: line.match(pattern) })),
    ).find((item) => item.match);
    if (match) {
      if (current) messages.push(current);
      current = {
        role: match.role,
        content: line.slice(match.match[0].length).trim(),
      };
    } else if (current) {
      current.content += `\n${line}`;
    } else if (line.trim()) {
      current = { role: "unknown", content: line.trim() };
    }
  }
  if (current) messages.push(current);

  if (messages.length <= 1) {
    return [{ role: "unknown", content: text }];
  }
  return messages.filter((item) => item.content.trim());
}

export function analyzeConversation(input, options = {}) {
  const messages = parseConversation(input);
  const userMessages = messages.filter((item) => item.role === "user");
  const assistantMessages = messages.filter((item) => item.role === "assistant");
  const inputTokens = estimateTokens(userMessages.map((item) => item.content).join("\n"));
  const outputTokens = estimateTokens(assistantMessages.map((item) => item.content).join("\n"));
  const totalTokens = estimateTokens(messages.map((item) => item.content).join("\n"));
  const promptCount = userMessages.length;
  const responseCount = assistantMessages.length;

  const signals = scoreSignals(messages);
  const overallScore = round(
    Object.values(signals).reduce((sum, item) => sum + item.score, 0) /
      Object.values(signals).length,
    1,
  );

  const model = options.model || "unknown";
  const pricing = options.pricing || {};
  const cost = calculateCost({ inputTokens, outputTokens }, pricing, model);

  return {
    record_type: "conversation_analysis",
    schema_version: "0.1",
    analyzed_at: new Date().toISOString(),
    summary: {
      message_count: messages.length,
      user_message_count: promptCount,
      assistant_message_count: responseCount,
      estimated_input_tokens: inputTokens,
      estimated_output_tokens: outputTokens,
      estimated_total_tokens: totalTokens,
      estimated_cost_usd: cost.usd_cost,
      pricing_status: cost.pricing_status,
    },
    conversation_quality: {
      overall_score_0_to_5: overallScore,
      dimensions: signals,
    },
    task: inferTask(messages),
    outputs: inferOutputs(messages),
    recommendations: buildRecommendations(messages, signals),
    evidence: {
      first_user_request: userMessages[0]?.content || messages[0]?.content || "",
      last_assistant_response:
        assistantMessages.at(-1)?.content || messages.at(-1)?.content || "",
    },
    meta: {
      analysis_mode: "explainable_heuristic_mvp",
      limitations: [
        "Token counts are estimated from text unless usage metadata is supplied.",
        "Value scores are directional and should be reviewed by a human.",
      ],
    },
  };
}

function scoreSignals(messages) {
  const allText = messages.map((item) => item.content).join("\n");
  const assistantText = messages
    .filter((item) => item.role === "assistant")
    .map((item) => item.content)
    .join("\n");
  return {
    task_clarity: scoredSignal(
      "任务清晰度",
      /\b(目标|要求|实现|请|需要|build|implement|fix|design|write)\b/i.test(allText) ? 4 : 2,
      "是否能识别明确目标、约束或交付要求。",
    ),
    output_completeness: scoredSignal(
      "产出完整度",
      Math.min(5, 1 + countMatches(assistantText, /(最终|总结|下一步|完成|代码|方案|result|summary|next steps|implementation)/gi)),
      "AI 是否给出可以继续使用的结果，而不是只停留在讨论。",
    ),
    verification: scoredSignal(
      "验证程度",
      Math.min(5, 1 + countMatches(assistantText, /(测试|验证|检查|运行|证据|引用|test|verify|check|evidence|citation)/gi)),
      "回答是否包含测试、证据、引用或可复核步骤。",
    ),
    iteration_efficiency: scoredSignal(
      "迭代效率",
      messages.length <= 12 ? 4 : messages.length <= 24 ? 3 : 2,
      "对话轮次与产出的关系，轮次过多可能意味着返工或探索成本。",
    ),
    actionability: scoredSignal(
      "可行动性",
      Math.min(5, 1 + countMatches(assistantText, /(可以|建议|步骤|命令|文件|直接|should|recommend|step|command|file)/gi)),
      "结果是否能被用户直接执行、实现或验证。",
    ),
  };
}

function inferTask(messages) {
  const first = messages.find((item) => item.role === "user") || messages[0];
  const text = first?.content || "";
  const scenario =
    /(论文|研究|实验|paper|research|experiment)/i.test(text)
      ? "research"
      : /(代码|功能|bug|程序|实现|code|feature|debug|implement)/i.test(text)
        ? "coding"
        : /(方案|产品|项目|prototype|product|project)/i.test(text)
          ? "prototype"
          : "mixed";
  return {
    scenario,
    goal: text.slice(0, 280),
    clarity: text.length > 40 ? "medium_or_high" : "low",
  };
}

function inferOutputs(messages) {
  const text = messages
    .filter((item) => item.role === "assistant")
    .map((item) => item.content)
    .join("\n");
  const types = [];
  if (/(```|代码|function|class |import |代码)/i.test(text)) types.push("code");
  if (/(方案|架构|设计|architecture|plan|roadmap)/i.test(text)) types.push("plan");
  if (/(报告|总结|论文|report|paper|summary)/i.test(text)) types.push("document");
  if (/(测试|验证|test|verify)/i.test(text)) types.push("verification");
  return {
    artifact_types: types.length ? [...new Set(types)] : ["conversation"],
    evidence_phrases: [
      ...new Set(
        (text.match(/(测试[^。\n]*|验证[^。\n]*|下一步[^。\n]*|建议[^。\n]*)/g) || []).slice(0, 5),
      ),
    ],
  };
}

function buildRecommendations(messages, signals) {
  const recommendations = [];
  if (signals.task_clarity.score < 4) recommendations.push("在对话开头明确目标、输入、约束和验收标准。");
  if (signals.verification.score < 4) recommendations.push("要求 AI 给出测试、证据、引用或可复核的验证步骤。");
  if (signals.actionability.score < 4) recommendations.push("要求输出具体文件、命令、决策或下一步动作。");
  if (signals.iteration_efficiency.score < 3) recommendations.push("把长对话拆成多个 Work Unit，分别记录探索、实现和复盘成本。");
  if (!recommendations.length) recommendations.push("对话结构较完整，可以进一步补充上线结果或实际采用证据。");
  return recommendations;
}

function calculateCost(tokens, pricing, model) {
  const modelPrice = pricing.models?.[model];
  if (!modelPrice) return { usd_cost: null, pricing_status: "missing_model_price" };
  return {
    usd_cost: round(
      (tokens.inputTokens / 1_000_000) * (modelPrice.input_per_million || 0) +
        (tokens.outputTokens / 1_000_000) * (modelPrice.output_per_million || 0),
      8,
    ),
    pricing_status: "calculated",
  };
}

function estimateTokens(text) {
  const value = String(text || "");
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = value.replace(/[\u3400-\u9fff]/g, "").trim();
  return cjk + Math.ceil(latin.length / 4);
}

function scoredSignal(label, score, description) {
  return { label, score: Math.max(0, Math.min(5, score)), description };
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase();
  if (role.includes("user") || role.includes("human") || role.includes("用户")) return "user";
  if (role.includes("assistant") || role.includes("ai") || role.includes("bot") || role.includes("助手")) return "assistant";
  return "unknown";
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
