# Atlas 系统架构设计师互动复习站点

这是当前部署到 Sites 的完整静态项目。`dist/` 是可直接部署的静态站点，`src/` 是模块化源码，`tests/` 是加载和数据兼容测试。开发规则在 [AGENTS.md](AGENTS.md)。

## 数据说明

题库数据来自用户提供的 HTML。站点保留原题文本和原始答案，不为原 HTML 没有提供的选项臆造内容。

- 多个填空题：每个空是独立答案；如果原题有选项，每个空有自己的一组单选项。
- 没有选项的空：仍保留标准答案，并在页面标注“原题未提供选项”。
- 论文题：采用论文案例阅读和复制功能，不渲染成选择题。

## 运行

前后端在 pnpm 工作区里。系统架构设计师题目在 `packages/bank-architecture`，HCIP AI 题目在 `packages/bank-hcip`，复习规则在 `packages/domain`。API 是 NestJS + Fastify，数据库是 PostgreSQL。`src/` 和 `dist/` 仍是静态站点。

```bash
pnpm install
pnpm db:up
pnpm dev
```

浏览器打开 `http://localhost:5173`。第一个账号用页面上的创建表单，之后公开注册关闭。API 监听 `3102`，Vite 把 `/api` 代理到它。

```bash
pnpm test
node tests/startup.mjs
pnpm test:api
```

`pnpm test:api` 需要本机 PostgreSQL 已启动。TypeScript 使用 5.9，因为 Nest 的装饰器和当前 ESLint 还不接受 TypeScript 7。
