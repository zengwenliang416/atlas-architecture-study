# Agent Note: 合并前跑 lint 和测试

Status: implemented

## Problem

`pnpm lint` 和 `pnpm test` 能抓住的脚本错误，如果没有和文档门禁出现在同一次拉取请求与 `main` 推送里，合并时看不见这些失败。

## Decision

`.github/workflows/ci.yml` 在目标分支为 `main` 的拉取请求上，以及推送到 `main` 时运行。`maintenance` 作业执行 `python3 scripts/verify_maintenance.py`。`lint and test` 作业执行 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm test`。`pnpm test` 包含 `@atlas/domain` 测试、`tests/smoke.mjs` 和 `tests/startup.mjs`。任一作业失败，这次工作流失败。文档门禁与产品脚本都在这一份工作流里。

## Alternatives considered

保留 `.github/workflows/docs.yml`，再加一条产品工作流。两条工作流响应同一组事件，门禁拆在两个文件里，看一次提交要同时盯两处。

把 `pnpm test:api` 放进同一条流水线。该脚本读取仓库根 `.env` 的 `DATABASE_URL`，并依赖已启动的 PostgreSQL。领域测试和冒烟不连接数据库，API 测试仍在本机按 [测试](../../../../docs/cookbook/test.md) 运行。

为界面另写 Playwright 或 Cypress。`tests/smoke.mjs` 已经覆盖静态题库不变量，浏览器套件不属于这条门禁。

## Consequences

`pnpm lint` 或 `pnpm test` 失败时，工作流为红，文档门禁也在同一工作流里。锁文件与 `package.json` 不一致时，`pnpm install --frozen-lockfile` 失败。`pnpm test:api` 仍要求本机数据库。这条门禁只调用已有脚本。`docs/cookbook/test.md` 的字数上限是 180，这页要写清两条作业跑哪些命令，并留下 5% 余量。合并按钮要拒绝失败的检查，需要 `main` 把作业 `maintenance` 和 `lint and test` 列为必需状态检查；工作流文件写不了这项仓库设置。操作说明在 [测试](../../../../docs/cookbook/test.md)。文档与笔记的分工见 [事实、规则和取舍分开存放](2026-11-01-docs-and-notes-split.md)。

生产发布不在这条工作流里，见 [main 推送后发布到这台服务器](2026-11-02-main-woodpecker-deploy.md)。
