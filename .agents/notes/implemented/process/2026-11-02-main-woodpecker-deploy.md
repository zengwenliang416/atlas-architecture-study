# Agent Note: main 推送后发布到这台服务器

Status: implemented

## Problem

GitHub Actions 只在拉取请求和 `main` 推送上跑门禁。服务器上没有对应的发布步骤，`main` 的新提交要另一次手工同步才会进生产目录。

## Decision

推送到 `main`，以及在 Woodpecker 里对 `main` 触发手动事件，都会跑 `.woodpecker/deploy.yml`。流水线只由同时带有 `location=production-80` 和 `repo=zengwenliang416/atlas-architecture-study` 的 agent 领取。`verify` 通过后，`deploy` 把不含 `.env`、`node_modules` 和 `dist` 的源码放到 `/opt/atlas/releases/<sha>`，由宿主机执行 `pnpm install --frozen-lockfile` 和 `pnpm build`，再把 `/opt/atlas/current` 指到该目录并重启 `atlas.service`。`/api/health` 在 30 秒内没有返回 `{"ok":true}` 时，`current` 回到上一份仍在磁盘上的发布并再次重启。密钥只留在 `/opt/atlas/shared/.env`。

## Alternatives considered

用 GitHub 托管 runner 经公网 SSH 发布。这台服务器上其他生产仓库已经由 Woodpecker 发布，公网再放一把可登录的部署钥匙没有必要。

把流水线容器里的 `node_modules` 原样拷到宿主机。pnpm 可能把包链到工作区外面的 store，而 `atlas.service` 用的是宿主机的 Node。在宿主机上安装和构建，跑起来的文件和进程是同一套。

## Consequences

GitHub 工作流仍然只做门禁，见 [合并前跑 lint 和测试](2026-11-01-ci-lint-and-test.md)。生产步骤在 [发布](../../../../docs/cookbook/deploy.md)。Woodpecker 仓库必须允许挂载卷，发布步骤才能写 `/opt/atlas` 并使用 Docker 套接字。拉取请求不发布。健康检查失败会把 `current` 拨回上一份发布，拨回之后的进程是否恢复由那份发布自己决定。
