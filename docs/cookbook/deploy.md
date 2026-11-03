# 发布

推送到 `main` 后，Woodpecker 读取 [`.woodpecker/deploy.yml`](../../.woodpecker/deploy.yml)。`verify` 执行 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm test` 和 `python3 scripts/verify_maintenance.py`。通过后 `deploy` 把这次提交放到 `/opt/atlas/releases/<sha>`，在服务器上构建，把 `/opt/atlas/current` 指过去，并重启 `atlas.service`。

密钥在 `/opt/atlas/shared/.env`。发布目录不包含 `.env`。API 监听 `3103`。Nginx 提供 `apps/web/dist`，并把 `https://atlas.motion-cover.com` 的 `/api/` 转到该端口。Agent 定义在 [`ops/woodpecker/agent-compose.yml`](../../ops/woodpecker/agent-compose.yml)，标签是 `location=production-80` 与 `repo=zengwenliang416/atlas-architecture-study`。该仓库在 Woodpecker 里允许挂载卷。

确认发布：`curl -fsS https://atlas.motion-cover.com/api/health` 返回 `{"ok":true}`，首页返回 200。流水线在 `https://ci.motion-cover.com`。健康检查失败时，`current` 回到上一份发布。
