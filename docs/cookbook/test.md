# 测试

```sh
pnpm lint
pnpm test
pnpm test:api
python3 scripts/verify_maintenance.py
```

`pnpm test` 跑 domain 测试、`tests/smoke.mjs`、`tests/startup.mjs`。`pnpm test:api` 使用仓库根 `.env` 里的 `DATABASE_URL`。文档和笔记门禁不连接数据库。门禁失败时先看它打印的路径，再按 [文档标准](../AGENTS.md) 改对应的家。

目标分支为 `main` 的拉取请求，以及推送到 `main`，由 [ci.yml](../../.github/workflows/ci.yml) 检查。`maintenance` 作业执行 `python3 scripts/verify_maintenance.py`。`lint and test` 作业依次执行 `pnpm install --frozen-lockfile`、`pnpm lint` 和 `pnpm test`。任一作业失败，该次检查失败。`pnpm test:api` 依赖本机数据库，在本机运行。
