# WorthIt

中文 | English

## 中文

WorthIt 是一个用于评估 AI Agent 生产力与投入产出的项目。

它关注的问题是：

> 使用 Codex、Claude Code 等 AI Agent 创造出来的代码、论文、原型或企业项目，其实际价值是否与消耗的 AI token、美元成本和人工成本相匹配？

项目不把 token 数量直接等同于价值，而是将一次 AI 辅助任务拆解为：

```text
AI 成本 + 人工成本 + 其他成本
                ↓
          交付物与证据
                ↓
       质量、实用性、创新性、采用度
                ↓
            ROI 分析
```

## 项目状态

当前处于 **本地优先核心 MVP 阶段**。

目前已经完成：

- `worthit-evaluator` Codex Skill
- `work_unit` 任务单元模型
- AI、人工和其他成本字段
- 交付物与证据字段
- 0-5 分价值评估 rubric
- 统一 JSON 输出模板
- 本地 JSONL 数据存储
- WorthIt CLI
- 成本、价值分数和分组汇总计算
- 记录校验命令

当前尚未实现：

- 自动发现 Codex 本地会话 token 用量
- 通过统一 JSONL 接口导入 Claude Code 或其他 Agent 用量
- 根据用户提交的模型价格表自行计算估算成本
- 接收用户提交的账单、人工成本和业务收益数据
- 自动关联 Git、PR、Issue 或部署结果
- 数据库和跨会话聚合
- Dashboard 和统计建模

## 当前项目结构

WorthIt 目前采用类似 ChatLab 的本地优先分层结构：

```text
worthit/
├── apps/
│   └── cli/
│       └── src/cli.mjs
├── packages/
│   └── core/
│       └── src/
│           ├── schema.mjs
│           ├── store.mjs
│           └── metrics.mjs
├── data/
├── examples/
└── README.md
```

当前架构原则：

- 本地优先，数据默认不上传
- Codex、Claude Code 等 Agent 统一成同一套数据模型
- 先保存事实和证据，再让 Agent 解释
- 核心逻辑放在可复用的 `packages/core`
- CLI、Skill 和未来 Web UI 共享同一套核心数据结构

参考方向以 ChatLab 为主，重点借鉴其本地优先、统一数据模型、共享核心包和证据驱动分析的思路。

## 核心概念：Work Unit

WorthIt 的基本分析单位是 `work_unit`，即一个边界清晰、可以独立评价的 AI 辅助任务。

建议使用以下粒度：

- 一个功能或 Pull Request
- 一个 Bug 修复
- 一个原型
- 一篇论文草稿或一次修订
- 一个研究实验
- 一个为期一周的企业内部项目

不建议直接把“整个季度研发”或“整个产品”作为一个 work unit，因为任务边界过大后，成本和价值难以归因。

## 评估维度

### 成本

记录尽可能完整的投入：

- 输入 token 数
- 输出 token 数
- AI 美元成本
- 模型名称
- 人工投入时间
- 人工小时成本
- API、计算、SaaS 和评审等其他成本
- 总估算成本

每个成本数据都应标记来源质量：

- `reported`：用户或系统直接提供
- `estimated`：根据已有信息估算
- `unknown`：暂时无法获得

### 产出

记录真正产生的交付物，而不是只记录 AI 做了多少工作：

- 代码、仓库、Patch 或 PR
- 论文、报告或备忘录
- 原型、Dashboard 或内部工具
- 测试、实验和文档
- 部署、合并或实际采用状态

优先记录可验证证据，例如：

- merged PR
- passing tests
- accepted draft
- deployed feature
- stakeholder review
- expert evaluation

### 价值

根据任务类型选择适用维度，每项按 0-5 分评分：

- `delivery_value`：交付完成度
- `practical_value`：业务或实际使用价值
- `quality_or_rigor`：质量或研究严谨性
- `novelty_or_insight`：创新性或洞察
- `adoption_confidence`：实际采用可能性

这些分数不是绝对真值，而是为了在统一尺度下进行方向性比较。

## Skill MVP

## 脱离软件使用：通用评估提示词

如果你希望在 ChatGPT、Claude、Gemini、通义、豆包、Kimi 或其他 AI 软件中直接进行 WorthIt 评估，可复制使用：

[`docs/standalone-evaluation-prompt.zh-CN.md`](docs/standalone-evaluation-prompt.zh-CN.md)

该提示词不依赖 WorthIt 软件，要求 AI 按统一的 work unit、成本、交付物、价值评分和 ROI 结构输出；生成的 JSON 整理为项目的 `work_unit` 记录后即可导入 WorthIt。

Skill 文件位于用户级 Codex Skills 目录：

```text
C:\Users\yi\.codex\skills\worthit-evaluator
```

主要文件：

```text
worthit-evaluator/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── rubric.md
    └── output-template.md
```

调用示例：

```text
Use $worthit-evaluator to evaluate this Codex-built feature as one work unit.
The task took about 3 hours, used around $8 of model spend, and produced a merged PR with tests.
```

论文场景示例：

```text
Use $worthit-evaluator to record this Claude Code paper-drafting task.
Evaluate the draft's practical value, rigor, novelty, and whether the AI cost seems justified.
```

对比场景示例：

```text
Use $worthit-evaluator to create comparable work-unit records for one Codex task and one Claude Code task.
```

Skill 的标准输出包含：

1. 简短的任务总结
2. 一个结构化 JSON 记录
3. 置信度、假设和缺失数据说明

## CLI MVP

项目现在提供一个不依赖第三方包的 Node.js CLI。

初始化本地数据目录：

```bash
npm run worthit -- init
```

导入一条 Skill 生成的评估 JSON：

```bash
npm run worthit -- add --file examples/coding-work-unit.json
```

查看已保存的任务：

```bash
npm run worthit -- list
```

生成成本和价值汇总：

```bash
npm run worthit -- analyze
```

校验本地记录：

```bash
npm run worthit -- validate
```

默认数据保存在 `data/`。如需使用其他目录：

```powershell
$env:WORTHIT_DATA_DIR = "D:\worthit-data"
npm run worthit -- analyze
```

CLI 当前会计算：

- 总成本
- 平均价值分
- 每个 Agent 的任务数量、总成本和平均价值分
- 每个场景的任务数量、总成本和平均价值分
- 每个价值分的单位成本

## Usage Collection and User Submission

WorthIt 将“使用量”“价格”“账单”和“价值结果”分开保存：

```text
本地 Agent 日志
       ↓
usage_events.jsonl
       ↓
用户提交价格表
       ↓
WorthIt 自行计算模型使用成本
       ↓
账单 / 人工成本 / 业务收益校正
       ↓
Work Unit ROI
```

### 自动发现 Codex 用量

扫描本机 Codex 会话日志：

```bash
npm run worthit -- discover codex --path C:\Users\yi\.codex\sessions --save
```

系统会保存：

- 输入 token
- 输出 token
- 缓存输入 token
- 推理输出 token
- 模型名称
- 会话 ID
- 原始日志路径
- 自动发现来源和置信度

### 导入 Claude Code 用量

Claude Code 使用标准 JSONL 导入接口：

```bash
npm run worthit -- import-usage claude_code --file examples/claude-usage.jsonl
```

只要每行包含类似结构即可：

```json
{
  "timestamp": "2026-08-19T10:00:00Z",
  "model": "example-claude-model",
  "usage": {
    "input_tokens": 12000,
    "output_tokens": 3500,
    "cached_input_tokens": 2000
  }
}
```

这样 Codex 和 Claude Code 最终会被转换成同一种 `usage_event` 结构。

### 提交价格表

价格由用户提交，WorthIt 根据 token 用量自行计算，而不是把用户手填的金额直接当作真实成本：

```bash
npm run worthit -- submit pricing --file examples/pricing-submission.json
```

价格表支持：

- 生效日期
- 币种
- 输入 token 单价
- 输出 token 单价
- 缓存输入 token 单价
- 价格来源

### 计算使用成本

```bash
npm run worthit -- cost-usage --pricing examples/pricing-submission.json
```

如果缺少某个模型的价格，系统会返回 `missing_model_price`，而不是猜测价格。

### 提交账单和其他数据

用户可以提交供应商账单：

```bash
npm run worthit -- submit billing --file examples/billing-submission.json
```

同一接口也支持：

```text
submit human-cost
submit outcome
submit pricing
submit billing
```

所有提交都会保存到 `data/submissions.jsonl`，并标记：

- 提交类型
- 提交时间
- 来源
- 原始文件路径
- 用户提供的原始内容

自动发现的数据保存在 `data/usage_events.jsonl`。

## 数据记录结构

MVP 使用以下逻辑结构：

```text
work_unit
├── 任务信息
├── 场景与 Agent
├── 时间窗口
└── 目标

costs
├── AI 成本
├── 人工成本
├── 其他成本
└── 总成本

outputs
├── 交付物类型
├── 交付物摘要
├── 证据
└── 状态

value_scores
├── 交付价值
├── 实用价值
├── 质量或严谨性
├── 创新或洞察
└── 采用信心

roi_snapshot
├── ROI 模式
├── 估算收益
├── 净价值
└── 收益成本比
```

当暂时无法估算收益金额时，使用定性模式，不强行计算财务 ROI：

```json
{
  "roi_mode": "qualitative",
  "estimated_value_usd": null,
  "net_value_usd": null,
  "benefit_cost_ratio": null
}
```

## 研究问题

WorthIt 后续可以用于研究以下问题：

### 成本与价值关系

- AI 成本与产出价值是否近似线性？
- 是否存在边际收益递减？
- 是否存在完成任务所需的成本阈值？
- 是否存在倒 U 型关系？
- 不同任务类型的关系是否不同？

### Agent 对比

- Codex 与 Claude Code 在相同任务上的成本差异
- 不同模型的质量和返工差异
- 工具调用次数与最终结果之间的关系
- 人工介入程度对最终价值的影响

### 场景对比

- 编程、论文、研究和企业项目是否适合用同一套指标？
- 高价值任务是否一定需要更高 token 消耗？
- AI 成本、人工成本和时间成本中，哪一项最能解释最终价值？

## 两种评估模式

### Observational

记录真实工作过程，不干预用户使用方式。

适合：

- 企业员工真实使用情况
- 长期项目跟踪
- AI 生产力日常统计

### Comparative

控制任务、目标和环境，比较不同 Agent 或不同预算下的结果。

适合：

- Codex 与 Claude Code 对比
- 不同模型对比
- 不同 token 预算对比
- 科研实验和论文写作

## 重要限制

WorthIt 的记录可以支持统计分析，但不能仅凭一条记录证明因果关系。

需要特别注意：

- AI 生成的内容不等于最终交付价值
- 价值可能来自人类判断、产品时机和团队协作
- 少量 token 也可能产生高价值洞察
- 大量 token 也可能只是返工或无效探索
- 评分存在主观性，需要保持 rubric 一致
- 企业收益通常需要在上线一段时间后才能评估

因此，项目更准确的目标是：

> 在控制任务类型、难度、人工投入和结果质量后，研究 AI Agent 成本与产出价值之间的统计关系。

## 发展路线

### 阶段一：Skill MVP

- 使用统一工作流记录任务
- 产出标准 JSON
- 手工积累代码和论文样本
- 验证 rubric 是否实用

### 阶段二：本地数据集

- 将每次评估保存为独立 JSON 文件
- 增加样本 ID、版本和时间戳
- 支持 CSV 导出
- 支持按 Agent、场景和项目汇总

### 阶段三：自动采集

- 读取 Agent 使用量
- 关联 Git commit、PR 和测试结果
- 记录人工修改与返工
- 连接账单或成本 API

### 阶段四：分析平台

- 构建成本与价值散点图
- 分析边际收益曲线
- 支持 Codex / Claude Code 对比
- 支持团队和项目级 ROI 报告
- 支持科研实验数据导出

## 当前建议

第一批样本建议只从代码场景开始，优先记录：

- 一个独立功能
- 一个 Bug 修复
- 一个小型原型
- 一个已经合并或部署的任务

代码任务比较容易获得客观证据，例如测试结果、PR 状态、部署状态和返工时间。等记录流程稳定后，再扩展到论文和企业项目。
## English

WorthIt is a project for evaluating the productivity and return on investment of AI agents.

It focuses on the following question:

> Is the practical value of code, papers, prototypes, or business projects created with AI agents such as Codex and Claude Code proportional to the tokens, dollars, and human effort consumed?

WorthIt does not equate token usage with value. Instead, it represents an AI-assisted task as:

```text
AI cost + human cost + other costs
                         ↓
                deliverables and evidence
                         ↓
        quality, usefulness, novelty, and adoption
                         ↓
                         ROI
```

## Project Status

The project is currently in the **local-first core MVP stage**.

Implemented:

- `worthit-evaluator` Codex Skill
- `work_unit` task model
- AI, human, and other cost fields
- Deliverable and evidence fields
- A 0-5 value assessment rubric
- A unified JSON output template
- Local JSONL storage
- WorthIt CLI
- Cost, value-score, and grouped summary calculations
- Record validation commands

Not implemented yet:

- Automatic discovery of local Codex session token usage
- Unified JSONL import for Claude Code or other agent usage
- Self-calculated usage cost from user-submitted model pricing
- User-submitted billing, human-cost, and business-outcome data
- Automatic integration with Git, pull requests, issues, or deployment results
- Database and cross-session aggregation
- Dashboard and statistical modeling

## Current Project Structure

WorthIt follows a local-first layered structure inspired primarily by ChatLab:

```text
worthit/
├── apps/
│   └── cli/
│       └── src/cli.mjs
├── packages/
│   └── core/
│       └── src/
│           ├── schema.mjs
│           ├── store.mjs
│           └── metrics.mjs
├── data/
├── examples/
└── README.md
```

Current architecture principles:

- Local-first: data is not uploaded by default
- Normalize Codex, Claude Code, and other agents into one data model
- Store facts and evidence before asking an agent to interpret them
- Keep reusable logic in `packages/core`
- Let the CLI, Skill, and future Web UI share the same data structures

The main architectural references are ChatLab's local-first design, shared core packages, unified data model, and evidence-driven analysis.

## Core Concept: Work Unit

The basic unit of analysis in WorthIt is a `work_unit`: a clearly bounded AI-assisted task that can be evaluated independently.

Recommended granularity:

- One feature or pull request
- One bug fix
- One prototype
- One paper draft or revision
- One research experiment
- One internal project completed within one week

Avoid using an entire quarter of engineering work or a whole product as one work unit. The boundary would be too broad, making cost and value attribution difficult.

## Evaluation Dimensions

### Cost

Record as much input cost as possible:

- Input tokens
- Output tokens
- AI cost in USD
- Model names
- Human time
- Loaded human hourly rate
- API, compute, SaaS, and review costs
- Estimated total cost

Each cost value should include a source-quality label:

- `reported`: directly provided by a user or system
- `estimated`: inferred from available information
- `unknown`: currently unavailable

### Output

Record the actual deliverable rather than only how much work the AI performed:

- Code, repository, patch, or pull request
- Paper, report, or memo
- Prototype, dashboard, or internal tool
- Tests, experiments, and documentation
- Deployment, merge, or adoption status

Prefer verifiable evidence such as:

- Merged pull request
- Passing tests
- Accepted draft
- Deployed feature
- Stakeholder review
- Expert evaluation

### Value

Select the dimensions that fit the task and score each from 0 to 5:

- `delivery_value`: completeness of delivery
- `practical_value`: business or practical usefulness
- `quality_or_rigor`: quality or research rigor
- `novelty_or_insight`: novelty or insight
- `adoption_confidence`: likelihood of actual adoption

These scores are not absolute truth. They provide a consistent scale for directional comparison across tasks.

## Skill MVP

The Skill is located in the user-level Codex Skills directory:

```text
C:\Users\yi\.codex\skills\worthit-evaluator
```

Main files:

```text
worthit-evaluator/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── rubric.md
    └── output-template.md
```

Usage example:

```text
Use $worthit-evaluator to evaluate this Codex-built feature as one work unit.
The task took about 3 hours, used around $8 of model spend, and produced a merged PR with tests.
```

Paper-writing example:

```text
Use $worthit-evaluator to record this Claude Code paper-drafting task.
Evaluate the draft's practical value, rigor, novelty, and whether the AI cost seems justified.
```

Comparison example:

```text
Use $worthit-evaluator to create comparable work-unit records for one Codex task and one Claude Code task.
```

The Skill produces:

1. A short task summary
2. One structured JSON record
3. A note describing confidence, assumptions, and missing data

## CLI MVP

The project now includes a dependency-free Node.js CLI.

Initialize the local data directory:

```bash
npm run worthit -- init
```

Import an evaluation JSON produced by the Skill:

```bash
npm run worthit -- add --file examples/coding-work-unit.json
```

List stored work units:

```bash
npm run worthit -- list
```

Generate cost and value summaries:

```bash
npm run worthit -- analyze
```

Validate local records:

```bash
npm run worthit -- validate
```

Data is stored in `data/` by default. Override the location with:

```bash
WORTHIT_DATA_DIR=/path/to/worthit-data npm run worthit -- analyze
```

The CLI currently calculates:

- Total cost
- Average value score
- Work-unit count, total cost, and average value score by agent
- Work-unit count, total cost, and average value score by scenario
- Cost per value point

## Usage Collection and User Submission

WorthIt stores usage, pricing, billing, and outcome data separately:

```text
Local agent logs
       ↓
usage_events.jsonl
       ↓
User-submitted pricing
       ↓
WorthIt calculates usage cost
       ↓
Billing / human cost / business outcome reconciliation
       ↓
Work-unit ROI
```

### Discover Codex Usage

Scan local Codex session logs:

```bash
npm run worthit -- discover codex --path C:\Users\yi\.codex\sessions --save
```

WorthIt stores:

- Input tokens
- Output tokens
- Cached input tokens
- Reasoning output tokens
- Model name
- Session ID
- Original log path
- Discovery source and confidence

### Import Claude Code Usage

Claude Code usage can be imported through the standard JSONL interface:

```bash
npm run worthit -- import-usage claude_code --file examples/claude-usage.jsonl
```

Each line can contain a structure such as:

```json
{
  "timestamp": "2026-08-19T10:00:00Z",
  "model": "example-claude-model",
  "usage": {
    "input_tokens": 12000,
    "output_tokens": 3500,
    "cached_input_tokens": 2000
  }
}
```

Codex and Claude Code are normalized into the same `usage_event` shape.

### Submit Pricing

Users submit pricing data, and WorthIt calculates usage cost from token counts:

```bash
npm run worthit -- submit pricing --file examples/pricing-submission.json
```

Pricing records support:

- Effective date
- Currency
- Input-token price
- Output-token price
- Cached-input price
- Pricing source

### Calculate Usage Cost

```bash
npm run worthit -- cost-usage --pricing examples/pricing-submission.json
```

If a model price is missing, the system returns `missing_model_price` instead of guessing.

### Submit Billing and Other Data

Users can submit provider invoices:

```bash
npm run worthit -- submit billing --file examples/billing-submission.json
```

The same interface supports:

```text
submit human-cost
submit outcome
submit pricing
submit billing
```

Submissions are stored in `data/submissions.jsonl` with:

- Submission type
- Submission time
- Source
- Original file path
- Original user-provided content

Automatically discovered usage is stored in `data/usage_events.jsonl`.

## Data Structure

The MVP uses the following logical structure:

```text
work_unit
├── task information
├── scenario and agents
├── time window
└── goal

costs
├── AI cost
├── human cost
├── other costs
└── total cost

outputs
├── artifact type
├── artifact summary
├── evidence
└── status

value_scores
├── delivery value
├── practical value
├── quality or rigor
├── novelty or insight
└── adoption confidence

roi_snapshot
├── ROI mode
├── estimated benefit
├── net value
└── benefit-cost ratio
```

When monetary benefit cannot yet be estimated, use qualitative mode instead of forcing a financial ROI calculation:

```json
{
  "roi_mode": "qualitative",
  "estimated_value_usd": null,
  "net_value_usd": null,
  "benefit_cost_ratio": null
}
```

## Research Questions

WorthIt can later be used to study:

### Cost and Value

- Is AI cost approximately linearly related to output value?
- Are there diminishing marginal returns?
- Is there a minimum cost threshold for completing a task?
- Does the relationship follow an inverted U-shape?
- Does the relationship differ across task types?

### Agent Comparison

- Cost differences between Codex and Claude Code on equivalent tasks
- Quality and rework differences between models
- The relationship between tool-call frequency and final value
- The effect of human involvement on outcome value

### Scenario Comparison

- Can coding, paper writing, research, and enterprise projects share one measurement framework?
- Do high-value tasks always require more token usage?
- Which factor best explains final value: AI cost, human cost, or elapsed time?

## Evaluation Modes

### Observational

Record real-world work without changing how users work.

Suitable for:

- Everyday enterprise use of AI
- Long-running project tracking
- Daily AI productivity measurement

### Comparative

Control the task, goal, and environment to compare different agents or budgets.

Suitable for:

- Codex versus Claude Code
- Model comparisons
- Token-budget comparisons
- Research experiments and paper writing

## Important Limitations

WorthIt records can support statistical analysis, but a single record cannot establish causality.

Important considerations:

- AI-generated content is not the same as final delivery value
- Value may also come from human judgment, product timing, and team collaboration
- A small token spend may produce a high-value insight
- A large token spend may represent rework or ineffective exploration
- Scoring is subjective and requires a consistent rubric
- Enterprise value often becomes measurable only after deployment

The more precise goal of this project is:

> To study the statistical relationship between AI-agent cost and output value while controlling for task type, difficulty, human involvement, and outcome quality.

## Roadmap

### Stage 1: Skill MVP

- Record tasks using a unified workflow
- Produce standardized JSON
- Collect coding and paper samples manually
- Validate whether the rubric is practical

### Stage 2: Local Dataset

- Save each evaluation as an individual JSON file
- Add sample IDs, versions, and timestamps
- Support CSV export
- Aggregate by agent, scenario, and project

### Stage 3: Automatic Collection

- Read agent usage data
- Link Git commits, pull requests, and test results
- Record human edits and rework
- Connect billing or cost APIs

### Stage 4: Analysis Platform

- Build cost-value scatter plots
- Analyze marginal-return curves
- Compare Codex and Claude Code
- Generate team- and project-level ROI reports
- Export research datasets

## Current Recommendation

Start with coding tasks and collect the following first:

- One independent feature
- One bug fix
- One small prototype
- One merged or deployed task

Coding tasks provide relatively objective evidence such as test results, pull-request status, deployment status, and rework time. Once the recording process is stable, expand to papers and enterprise projects.
