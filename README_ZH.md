# WorthIt

WorthIt 不是只问「做完了吗」，而是帮助 AI 进一步判断：**这段 AI 协作，值不值？**

它默认评估当前 Codex 对话和/或项目，而不是要求你复制粘贴一段文字。评估会综合对话中的目标、迭代和返工，以及项目文件、Git、测试和部署等实际证据，再判断 AI 与人工投入是否值得。

## 安装

将 [`worthit`](worthit) 文件夹复制到 Codex 的 skills 目录：

```text
<Codex skills directory>/worthit/
```

也可以使用 Skills CLI 安装：

```bash
npx skills add ybiu/worthit --skill worthit -g
```

在任务中直接使用：

```text
Use $worthit to evaluate this Codex conversation and project from the available evidence.
```

WorthIt 会先读取当前任务上下文；如果是代码项目，还会检查相关文件、Git 历史、测试和部署信息。只有当前对话或项目不可访问时，才需要你手动提供上下文。

## 成本估算

`scripts/codex_cost_report.py` 会读取本地 Codex 会话日志并生成独立 HTML 成本报告。复制 [`cost-config.example.toml`](worthit/references/cost-config.example.toml)，为准确模型填写有日期的公开 API 价格；也可以补充有依据的套餐使用占比。报告会将 API 等价成本和订阅分摊严格分开，它们都不是实际账单。

## 你会得到什么

- 一个结论：`worth_it`、`promising`、`not_yet` 或 `not_worth_it`
- 基于交付、实际价值、质量、洞察和采纳证据的评分卡
- 可直接保存和分享的自包含 HTML 报告
- AI 成本放在第一位，输入和输出费用分别计算
- 根据用户对话语言生成中文或英文报告
- 最后一节分析用户实际输入，并给出可执行的提示词工程建议
- 对假设、未知项和下一步关键测量的坦诚说明

## 它不会做什么

WorthIt 不会把 Token 数量直接当作价值，不会编造财务回报，也不要求用户提供 API Key。没有成本或收益数据时，它仍会做定性判断，并明确记录不确定性。

## 示例

完整示例见 [coding-work-unit.html](worthit/examples/coding-work-unit.html)。

## 许可证

[MIT](LICENSE)
