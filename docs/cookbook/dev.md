# 本地运行

需要 Node.js 22 或更新版本，以及 pnpm 10.20.0。密钥放在仓库根的 `.env`，样例是 `.env.example`。`.env` 不入库。

```sh
pnpm install
pnpm db:up
pnpm dev
```

PostgreSQL 17 由 Compose 映射到本机 `54329`，库名、用户和口令都是 `atlas`。数据卷名是 `atlas_pg`。API 监听 `3102`，Web 监听 `5173`。浏览器打开 `http://localhost:5173`。第一个账号用页面上的创建表单。

停数据库用 `pnpm db:down`。这个命令停止容器，不删除数据卷。
