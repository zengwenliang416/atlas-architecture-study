# 题库

`@atlas/bank-architecture` 保存系统架构设计师题面和题库标识。`@atlas/bank-llm` 保存大模型题面，标识是 `llm`。应用读取题库包，不改写原题文本和原始答案。

选择题、填空题和论文题保持来源里的结构。多个空各自作答。来源没有选项的空保留标准答案，页面标明原题未提供选项。论文题保持阅读材料，不渲染成选择题。

大模型题库由 [scripts/build-bank-llm.mjs](../../scripts/build-bank-llm.mjs) 从 `packages/bank-llm/source.docx` 生成。填空没有选项。单选题和判断题按一个字母判对错。多选题按整组字母判对错。来源没有逐项释义，页面只显示选项原文和是否该选。docx 后一节的标题写成填空题，题目是判断题。
