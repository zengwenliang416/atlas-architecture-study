# 静态站点

`src/` 是可在浏览器里直接打开的复习页，`dist/` 是它的部署副本。学习状态写入 `localStorage`，键名是 `architecture_review_focused_notes_v2`。

`src/storage.js` 的间隔序列与 `REVIEW_INTERVALS` 相同，日历日按 Asia/Shanghai，与 [复习规则](domain.md) 同一天界，模块并不共用。全部题目只列出卡片。「揭晓答案」才显示答案。今天和接下来的计划各 13 条，多出的写剩余道数。笔记是三个文本槽，留在这台浏览器；登录后的复习台可以导入。笔记上限见 [复习规则](domain.md)。
