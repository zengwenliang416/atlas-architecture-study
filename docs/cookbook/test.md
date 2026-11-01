# 测试

```sh
pnpm test
pnpm test:api
python3 scripts/verify_maintenance.py
```

`pnpm test` 跑 domain 测试和 `tests/smoke.mjs`。`pnpm test:api` 使用仓库根 `.env` 里的 `DATABASE_URL`。文档和笔记门禁不连接数据库。门禁失败时先看它打印的路径，再按 [文档标准](../AGENTS.md) 改对应的家。
