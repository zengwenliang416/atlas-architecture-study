# Agent Note: 交卷路径在本机库和浏览器里对过

Status: implemented

## Problem

[费曼门槛、换空和按空揭晓](../feature/2026-11-01-feynman-blank-focus.md) 与 [交卷队列、错题、草稿和月历](../feature/2026-11-01-exam-queue-shared-desk.md) 落地时，`pnpm test:api` 没有连上数据库，登录后的复习台也没有在浏览器里点过。

## Decision

核对使用仓库根 `.env.example` 里的 `DATABASE_URL`。本机 PostgreSQL 16.15 听在 `127.0.0.1:54329`。空库由 drizzle 应用 `0000_init` 与 `0001_attempt_essay`。另一库只先有 `0000` 的表和两行 `study_record`，再执行 `0001`：等级、间隔、笔记和版本仍在，`attempt` 为空，`essay_draft` 为空字符串。

`pnpm test:api` 通过。未登录的论文草稿和交卷请求返回 401。非法题目编号、超长草稿和非法逐空结果被拒绝。交卷把每空写成 right、wrong、skip 或 open，不改阶段、复习次数和下一次到期日。完成复习仍推进间隔；同一天再次完成不推进，交卷结果留在同一行。

登录后的复习台在 `http://127.0.0.1:5173` 点过。空着的费曼笔记按不了「今天复习完」，写下一句之后可以，到期日推到下一天。方括号在双空题上换空。揭晓此空只打开当前空，遮挡此空再盖上。错题只留下上次答错或未答的选择题。论文草稿写入后刷新仍在，范文不动。交卷对照用红左边线。上海当月格子把今天到期的题计在今天，更晚的计在到期日。今天的列表先给出 13 条，多出的写剩余道数。`dist/index.html` 在 390px 宽时显示底栏，不显示「顶部」。

Q33 的概念图有两步都叫 Load，React 提示 key 重复。两步都画在图上，点开的说明各不相同，标记没有改。浏览器另外请求 `/favicon.ico`，站点没有这个文件。

## Alternatives considered

改掉 Load 的 React key。两步都能点中，说明也不串，改键不改变复习行为。

把这次浏览器点击收进 `pnpm test`。门禁不启动数据库，见 [测试](../../../../docs/cookbook/test.md)。

## Consequences

应用代码没有改。`packages/bank-architecture`、`src/data.js` 和三份 desk 文件保持原字节。`pnpm test:api` 仍对着本机 `DATABASE_URL` 跑。
