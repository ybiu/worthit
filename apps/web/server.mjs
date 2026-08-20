import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeConversation } from "../../packages/core/src/conversation.mjs";
import { JsonlStore } from "../../packages/core/src/store.mjs";

const root = resolve(fileURLToPath(new URL("./public", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const store = new JsonlStore(resolve(process.env.WORTHIT_DATA_DIR || "data"));

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/analyze") {
      const body = await readBody(request);
      const input = JSON.parse(body || "{}");
      const conversation = await resolveConversationInput(input);
      const result = analyzeConversation(conversation, input.options || {});
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

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`WorthIt web running at http://127.0.0.1:${port}`);
});

async function resolveConversationInput(input) {
  const text = input.text?.trim();
  if (!text) {
    throw new Error("请粘贴对话文本。");
  }

  const urls = [...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map(
    (match) => match[0].replace(/[.,;:!?]+$/, ""),
  );
  if (!urls.length) return text;

  const linkedContents = [];
  for (const value of [...new Set(urls)].slice(0, 3)) {
    const url = new URL(value);
    const response = await fetchConversationUrl(url);
    linkedContents.push(`\n\n[Linked conversation: ${value}]\n${response}`);
  }
  return `${text}${linkedContents.join("")}`;
}

async function fetchConversationUrl(url) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("对话中的链接必须使用 HTTP 或 HTTPS 协议。");
  }
  const response = await fetch(url, {
    headers: { "user-agent": "WorthIt conversation analyzer/0.1" },
  });
  if (!response.ok) {
    throw new Error(`链接读取失败：HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const content = await response.text();
  if (contentType.includes("application/json")) {
    return JSON.stringify(JSON.parse(content), null, 2);
  }
  return content;
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
