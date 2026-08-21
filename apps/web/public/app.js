const textInput = document.querySelector("#conversationText");
const modelInput = document.querySelector("#model");
const apiKeyInput = document.querySelector("#apiKey");
const baseUrlInput = document.querySelector("#baseUrl");
const scenarioInput = document.querySelector("#scenario");
const analyzeButton = document.querySelector("#analyzeButton");
const charCount = document.querySelector("#charCount");
const recentList = document.querySelector("#recentList");
const historyCount = document.querySelector("#historyCount");
const pageTitle = document.querySelector("#pageTitle");
const settingsModal = document.querySelector("#settingsModal");

textInput.addEventListener("input", () => {
  charCount.textContent = `${textInput.value.length.toLocaleString()} characters`;
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const view = button.dataset.view;
    pageTitle.textContent = view === "analyze" ? "对话分析" : view === "history" ? "分析记录" : "总体洞察";
    if (view === "history") {
      loadHistory();
      document.querySelector(".input-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (view === "insights") {
      showInsightHint();
    }
  });
});

document.querySelector("#refreshHistory").addEventListener("click", loadHistory);
document.querySelector("#settingsButton").addEventListener("click", () => {
  document.querySelector("#settingsModel").value = modelInput.value;
  document.querySelector("#settingsBaseUrl").value = baseUrlInput.value;
  document.querySelector("#settingsApiKey").value = apiKeyInput.value;
  settingsModal.classList.remove("hidden");
});
document.querySelector("#closeSettings").addEventListener("click", closeSettings);
settingsModal.addEventListener("click", (event) => { if (event.target === settingsModal) closeSettings(); });
document.querySelector("#clearApiKey").addEventListener("click", () => { apiKeyInput.value = ""; document.querySelector("#settingsApiKey").value = ""; });
document.querySelector("#saveSettings").addEventListener("click", () => {
  modelInput.value = document.querySelector("#settingsModel").value.trim() || "gpt-4o-mini";
  baseUrlInput.value = document.querySelector("#settingsBaseUrl").value.trim() || "https://api.openai.com/v1";
  apiKeyInput.value = document.querySelector("#settingsApiKey").value.trim();
  closeSettings();
  showToast("设置已保存到当前页面会话");
});

document.querySelector("#clearWorkspace").addEventListener("click", () => {
  textInput.value = "";
  modelInput.value = "unknown";
  scenarioInput.value = "auto";
  textInput.dispatchEvent(new Event("input"));
  document.querySelector("#resultContent").classList.add("hidden");
  document.querySelector("#emptyState").classList.remove("hidden");
});

document.querySelector("#loadExample").addEventListener("click", () => {
  textInput.value = `User: 我想做一个工具，统计 Codex 和 Claude Code 的 token 成本，并评估最终项目价值。希望先做一个 Skill 版 MVP。

Assistant: 可以把一次任务定义为 work unit，记录 Agent 用量、人工时间、交付物、测试和采用状态。第一版可以使用本地 JSONL 存储，后续再接 Git 和 dashboard。

User: 那请你实现一个本地 CLI，能够导入评估记录并计算总成本和价值分数。

Assistant: 我会创建统一 schema、JSONL store、metrics 模块和 CLI 命令，并用一条示例记录验证 add、analyze 和 validate 流程。`;
  textInput.dispatchEvent(new Event("input"));
});

analyzeButton.addEventListener("click", async () => {
  setLoading(true);
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: textInput.value,
        options: {
          model: modelInput.value.trim() || "unknown",
          apiKey: apiKeyInput.value.trim(),
          baseUrl: baseUrlInput.value.trim(),
          scenario: scenarioInput.value,
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "分析失败");
    renderResult(result);
    loadHistory();
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
});

function renderResult(result) {
  document.querySelector("#emptyState").classList.add("hidden");
  document.querySelector("#resultContent").classList.remove("hidden");
  const summary = result.summary;
  const score = result.conversation_quality.overall_score_0_to_5;

  document.querySelector("#overallScore").textContent = score.toFixed(1);
  document.querySelector("#scoreNote").textContent = score >= 4 ? "对话产出较完整，具备较好的行动价值。" : score >= 3 ? "对话有一定产出，但仍需要补充验证或结果证据。" : "对话价值偏低，建议先改善目标和验收标准。";
  document.querySelector("#messageCount").textContent = summary.message_count;
  document.querySelector("#tokenCount").textContent = formatNumber(summary.estimated_total_tokens);
  document.querySelector("#ioCount").textContent = `${formatNumber(summary.estimated_input_tokens)} / ${formatNumber(summary.estimated_output_tokens)}`;
  document.querySelector("#costCount").textContent = summary.estimated_cost_usd === null ? "未定价" : `$${summary.estimated_cost_usd}`;

  const dimensions = document.querySelector("#dimensionList");
  dimensions.innerHTML = Object.values(result.conversation_quality.dimensions).map((dimension) => `
    <div class="dimension-row">
      <span class="dimension-label">${escapeHtml(dimension.label)}</span>
      <div class="bar"><div class="bar-fill" style="width: ${dimension.score * 20}%"></div></div>
      <span class="dimension-score">${dimension.score}</span>
    </div>`).join("");

  document.querySelector("#taskScenario").textContent = result.task.scenario;
  document.querySelector("#taskGoal").textContent = result.task.goal || "未能识别明确目标";
  document.querySelector("#artifactTypes").innerHTML = result.outputs.artifact_types.map((type) => `<span class="tag">${escapeHtml(type)}</span>`).join("");
  document.querySelector("#evidencePhrases").textContent = result.outputs.evidence_phrases.length ? result.outputs.evidence_phrases.join(" · ") : "暂未识别到明确的验证证据。";
  document.querySelector("#recommendations").innerHTML = result.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    const data = await response.json();
    const items = data.items || [];
    historyCount.textContent = items.length;
    recentList.innerHTML = items.length
      ? items.slice(0, 6).map((item) => {
          const score = item.conversation_quality?.overall_score_0_to_5;
          const goal = item.task?.goal || item.evidence?.first_user_request || "未命名分析";
          return `<button class="recent-item" data-analysis-id="${escapeHtml(item.analyzed_at || "")}" title="点击查看分析结果">
            <span class="recent-item-title">${escapeHtml(goal.slice(0, 38))}</span>
            <span class="recent-item-meta">${score == null ? "—" : `${score.toFixed(1)} / 5`} · ${formatDate(item.analyzed_at)}</span>
          </button>`;
        }).join("")
      : '<div class="recent-empty">还没有分析记录</div>';
    recentList.querySelectorAll(".recent-item").forEach((item) => item.addEventListener("click", () => loadHistoryItem(item.dataset.analysisId)));
  } catch {
    recentList.innerHTML = '<div class="recent-empty">记录暂时不可用</div>';
  }
}

async function loadHistoryItem(analyzedAt) {
  try {
    const response = await fetch(`/api/history/item?analyzed_at=${encodeURIComponent(analyzedAt)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "无法读取分析记录");
    renderResult(result);
    pageTitle.textContent = "分析记录";
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelector('[data-view="history"]').classList.add("active");
    document.querySelector(".result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { showError(error.message); }
}

function showInsightHint() {
  document.querySelector("#scoreNote").textContent = "总体洞察将在积累更多分析记录后显示。";
  document.querySelector("#emptyState").classList.remove("hidden");
  document.querySelector("#resultContent").classList.add("hidden");
}

function setLoading(loading) {
  analyzeButton.disabled = loading;
  analyzeButton.innerHTML = loading ? "<span>分析中…</span>" : '<span class="button-icon">↗</span>开始分析';
}

function showError(message) {
  let error = document.querySelector(".error");
  if (!error) {
    error = document.createElement("p");
    error.className = "error";
    analyzeButton.after(error);
  }
  error.textContent = message;
}

function closeSettings() { settingsModal.classList.add("hidden"); }
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) { toast = document.createElement("div"); toast.className = "toast"; document.body.append(toast); }
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 1800);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return "未知时间";
  return new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

loadHistory();
