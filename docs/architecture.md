# 架构

Atlas 把系统架构设计师和 HCIP AI 两套题库做成可登录的复习应用，并保留一份静态站点。

题面在 `packages/bank-architecture` 与 `packages/bank-hcip`。掌握等级、间隔、筛选和笔记长度在 `packages/domain`。填空状态、交卷对照和月历负荷的纯函数在 `packages/desk`。`apps/api` 用 NestJS 和 Fastify 提供会话与学习记录，数据在 PostgreSQL。`apps/web` 用 Vite 和 React 调用这个 API。`src/` 与 `dist/` 是静态站点，学习状态写在浏览器 `localStorage`。

一次复习从 Web 进入已登录的 API。API 用 domain 计算下一次间隔，再把该用户的记录写回数据库。静态站点不经过 API，用 `src/storage.js` 里的间隔表在浏览器里推进。浏览器里的记录可以通过 API 的导入接口写入数据库。

进行中的界面规格放在 `openspec/`。规格落地后的行为写进本目录，取舍写进 `.agents/notes/`。
