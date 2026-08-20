# WorthIt

**语言 / Language:** [简体中文](README.zh-CN.md) · [English](README.en.md)

WorthIt 是一个用于评估 AI Agent 生产力与投入产出的本地优先项目。

它回答一个核心问题：使用 Codex、Claude Code 等 AI Agent 创造的代码、论文、原型或企业项目，其实际价值是否与消耗的 AI 成本、人工时间和其他投入相匹配？

## 核心方法

WorthIt 不把 token 数量直接等同于价值，而是将一次 AI 辅助任务拆解为：

```text
AI 成本 + 人工成本 + 其他成本
                ↓
          交付物与证据
                ↓
       质量、实用性、创新性、采用度
                ↓
            ROI 分析
```

最小评估单元是 `work_unit`，例如一个功能、Bug 修复、原型、实验、论文草稿或短期内部项目。每个单元记录：

- AI、人工和其他成本
- 实际交付物与可验证证据
- 交付完成度、实际价值、质量/严谨性、新颖性和采用信心（0–5 分）
- 定性或货币化 ROI

## 当前状态

当前为本地优先核心 MVP，已支持：

- WorthIt CLI
- 统一 `work_unit` JSON 模型
- 本地 JSONL 数据存储
- 成本、价值分数和分组汇总
- Codex 用量发现与 Claude Code JSONL 导入
- 价格、账单、人工成本和结果提交
- 记录校验
- 可脱离软件使用的通用评估提示词

## 快速开始

要求 Node.js 20 或更高版本：

```bash
npm run worthit -- init
npm run worthit -- add --file examples/coding-work-unit.json
npm run worthit -- list
npm run worthit -- analyze
npm run worthit -- validate
```

默认数据保存在 `data/`。如需使用其他目录：

```powershell
$env:WORTHIT_DATA_DIR = "D:\worthit-data"
npm run worthit -- analyze
```

## 通用提示词

无需安装 WorthIt，也可以将任务上下文粘贴到任意 AI 软件中进行评估：

[脱离软件使用的通用评估提示词](docs/standalone-evaluation-prompt.zh-CN.md)

## 项目结构

```text
worthit/
├── apps/cli/                 # CLI
├── apps/web/                 # 本地 Web 界面
├── packages/core/            # 共享数据模型、存储和指标逻辑
├── examples/                 # 示例记录与提交
├── docs/                     # 使用文档和通用提示词
└── data/                     # 默认本地数据目录
```

## 重要限制

当前尚未自动关联 Git、PR、Issue、部署和业务收益，也不把 token 数量直接视为价值。ROI 结论应结合交付物和证据理解；数据不足时会明确标注估算、假设和缺失字段。

返回 [README 首页](README.md) 或切换到 [English](README.en.md)。
