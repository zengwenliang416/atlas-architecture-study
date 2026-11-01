# 静态站点

`src/` 是可在浏览器里直接打开的复习页，`dist/` 是它的部署副本。学习状态写入 `localStorage`，键名是 `architecture_review_focused_notes_v2`。

间隔天数写在 `src/storage.js`，序列与 `@atlas/domain` 的 `REVIEW_INTERVALS` 相同，模块并不共用。静态页的笔记是三个文本槽。工作区笔记上限见 [复习规则](domain.md)。
