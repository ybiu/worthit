import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeConversation } from "../../packages/core/src/conversation.mjs";
import { JsonlStore } from "../../packages/core/src/store.mjs";

const root = resolve(fileURLToPath(new URL("./public", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const store = new JsonlStore(resolve(process.env.WORTHIT_DATA_DIR || "data"));

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/analyze") {
      const body = await readBody(request);
      const input = JSON.parse(body || "{}");
      const conversation = await resolveConversationInput(input);
      const result = await analyzeWithAI(conversation, input.options || {});
      await store.appendConversationAnalysis(result);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, { ok: true, service: "worthit-web" });
      return;
    }

    if (request.method === "GET" && request.url === "/api/history") {
      const analyses = await store.listConversationAnalyses();
      sendJson(response, 200, {
        items: analyses.slice(-20).reverse(),
      });
      return;
    }

    if (request.method === "GET" && request.url.startsWith("/api/history/item")) {
      const requestUrl = new URL(request.url, "http://localhost");
      const analyzedAt = requestUrl.searchParams.get("analyzed_at");
      const analyses = await store.listConversationAnalyses();
      const item = analyses.find((entry) => entry.analyzed_at === analyzedAt);
      if (!item) {
        sendJson(response, 404, { error: "分析记录不存在或已被清理。" });
        return;
      }
      sendJson(response, 200, item);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`WorthIt web running at http://${host}:${port}`);
});

async function resolveConversationInput(input) {
  const text = input.text?.trim();
  if (!text) {
    throw new Error("请粘贴对话文本。");
  }
  return text;
}

async function analyzeWithAI(conversation, options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) throw new Error("请输入 API Key，WorthIt 现在使用 AI 进行分析。");

  const model = String(options.model || "gpt-4o-mini").trim();
  const baseUrl = String(options.baseUrl || "https://api.openai.com/v1")
    .trim()
    .replace(/\/+$/, "");
  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error("API 地址格式无效。");
  }
  if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
    throw new Error("API 地址必须使用 HTTP 或 HTTPS。");
  }
  const local = analyzeConversation(conversation, { ...options, model });
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `你是 WorthIt AI 工作单元评估器。请只根据用户提供的对话进行评估，不编造成本、token、收益或证据。返回严格合法的 JSON，不要 Markdown 代码围栏。价值分数只能是 0 到 5 的数字。请使用以下结构：
{
  "overall_score_0_to_5": 0,
  "score_note": "一句话解释综合判断",
  "dimensions": {
    "task_clarity": {"label":"任务清晰度","score":0,"description":""},
    "output_completeness": {"label":"产出完整度","score":0,"description":""},
    "verification": {"label":"验证程度","score":0,"description":""},
    "iteration_efficiency": {"label":"迭代效率","score":0,"description":""},
    "actionability": {"label":"可行动性","score":0,"description":""}
  },
  "task": {"scenario":"coding|research|prototype|mixed","goal":"","clarity":"low|medium_or_high"},
  "outputs": {"artifact_types":[],"evidence_phrases":[]},
  "recommendations": []
}
评分应以实际交付物、验证证据和可执行性为准；信息不足时降低分数并在 description 中说明。`,
        },
        { role: "user", content: conversation },
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `AI 请求失败：HTTP ${response.status}`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 没有返回有效分析结果。");
  let aiResult;
  try {
    aiResult = JSON.parse(String(content).replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim());
  } catch {
    throw new Error("AI 返回的不是合法 JSON，请更换模型或重试。");
  }
  return normalizeAIResult(local, aiResult, model);
}

function normalizeAIResult(local, ai, model) {
  const dimensions = { ...local.conversation_quality.dimensions };
  for (const [key, fallback] of Object.entries(dimensions)) {
    const item = ai.dimensions?.[key];
    if (!item) continue;
    const score = Number(item.score);
    dimensions[key] = {
      label: item.label || fallback.label,
      score: Number.isFinite(score) ? Math.max(0, Math.min(5, score)) : fallback.score,
      description: item.description || fallback.description,
    };
  }
  const score = Number(ai.overall_score_0_to_5);
  return {
    ...local,
    conversation_quality: {
      overall_score_0_to_5: Number.isFinite(score)
        ? Math.max(0, Math.min(5, score))
        : Number(Object.values(dimensions).reduce((sum, item) => sum + item.score, 0) / Object.keys(dimensions).length).toFixed(1),
      dimensions,
    },
    task: { ...local.task, ...(ai.task || {}) },
    outputs: { ...local.outputs, ...(ai.outputs || {}) },
    recommendations: Array.isArray(ai.recommendations) ? ai.recommendations : local.recommendations,
    meta: { ...local.meta, analysis_mode: "ai", model },
  };
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = pathname === "/" ? "index.html" : pathname.slice(1);
  const target = resolve(root, file);
  if (!target.startsWith(root)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }
  try {
    const content = await readFile(target);
    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
    }[extname(target)] || "application/octet-stream";
    response.writeHead(200, { "content-type": type });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error("输入内容不能超过 2 MB。"));
    });
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
