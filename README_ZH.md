# WorthIt

WorthIt 不是只问「做完了吗」，而是帮助 AI 进一步判断：**这段 AI 协作，值不值？**

它面向一个边界清晰的工作单元：一个功能、原型、研究轮次、文稿修改、实验或运营任务。评估会综合实际产出、证据、AI 与人工投入、不确定性，以及明确的价值量表。

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
Use $worthit to evaluate this AI-assisted work: [粘贴任务背景、投入、结果与证据]
```

## 你会得到什么

- 一个结论：`worth_it`、`promising`、`not_yet` 或 `not_worth_it`
- 基于交付、实际价值、质量、洞察和采纳证据的评分卡
- 便于跨任务比较的标准 JSON 记录
- 对假设、未知项和下一步关键测量的坦诚说明

## 它不会做什么

WorthIt 不会把 Token 数量直接当作价值，不会编造财务回报，也不要求用户提供 API Key。没有成本或收益数据时，它仍会做定性判断，并明确记录不确定性。

## 示例

完整示例见 [coding-work-unit.json](worthit/examples/coding-work-unit.json)。

## 许可证

[MIT](LICENSE)
