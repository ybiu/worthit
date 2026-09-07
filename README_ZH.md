# WorthIt

[English](README.md)

WorthIt 是一个 local-first 的 AI 工作账本，把 Token 使用量、模型价格、项目活动、交付证据连接起来，回答一个更实际的问题：**这段 AI 协作是否值得它的成本？**

当前仓库是独立的软件产品。Codex Skill 位于 [worthit_skill](https://github.com/ybiu/worthit_skill)，可复制的通用提示词位于 [worthit_prompt](https://github.com/ybiu/worthit_prompt)。

## 当前架构

```text
AI 日志 → collectors → 统一 UsageRecord → storage
                                      ├→ pricing → analytics → Dashboard
                                      └→ Work Receipt → evaluator → 价值结论
```

```text
apps/web/                 # Overview Dashboard
packages/core/            # 统一 Token 与工作凭证类型
packages/collectors/      # AI 工具日志适配器
packages/pricing/         # 带日期的公开模型价格表
packages/analytics/       # 成本、Token 和浪费信号聚合
packages/storage/         # 本地 SQLite 边界
packages/evaluator/       # 基于证据的 WorthIt 结论
packages/skill/           # 内置 Codex Skill 分发包
```

## 本地运行

浏览器预览要求 Node.js 20 以上；如果使用 Node/SQLite 适配器，要求 Node.js 22（当前使用内置 `node:sqlite`）：

```bash
npm install
npm run dev
```

当前 MVP 已包含一条可运行的垂直链路：浏览器本地导入 Codex `rollout-*.jsonl`，解析并去重累计 token 快照，按带日期的模型价格估算成本，生成 Work Unit / Work Receipt，并在证据不足时保持 `尚未判断`。

Dashboard 中可以为 Work Unit 补充 Git diff、测试、构建、部署、产物和用户采用/反馈证据，同时记录人工分钟、时薪、其他成本和采用信心。保存后会重新生成 Work Receipt 和 verdict。浏览器账本保存于 `localStorage`；Node 程序可以通过 `@worthit/storage/node` 使用 SQLite：

```js
import { openLedger } from '@worthit/storage/node';

const ledger = openLedger('.worthit/worthit.sqlite3');
ledger.saveBundle({ usage, evidence, workUnits, receipts });
console.log(ledger.counts());
ledger.close();
```

SQLite 适配器使用 WAL、外键、稳定 ID upsert、schema migration 和 `ledger_events` 审计事件；重复导入不会重复创建实体。

## 产品原则

- Local-first：提示词、凭据和原始会话留在用户电脑上。
- 观察值、用户提供值、估算值和未知值保持区分。
- API 等价成本和订阅分摊是两种独立估算，不能合并成一张账单。
- Token 数量是成本信号，不是价值证明。

详见 [docs/architecture.md](docs/architecture.md) 和 [PRODUCT.md](PRODUCT.md)。

## 许可证

[MIT](LICENSE)
