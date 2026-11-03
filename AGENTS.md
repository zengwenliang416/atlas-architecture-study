# AGENTS.md

Atlas 是系统架构设计师互动复习应用。改分层前读 [docs/architecture.md](docs/architecture.md)。写文档前读 [docs/AGENTS.md](docs/AGENTS.md)。

## 开工

- 改哪个目录，就先读该目录的 `AGENTS.md`，再读它指向的子系统页。
- 非平凡改动（行为、架构、跨文件契约、流程与工具链、测试策略、落盘格式）先搜索 [.agents/notes/](.agents/notes/README.md)，并在同一次改动里更新拥有该决定的笔记。样式、格式化、无歧义重命名、单文件里看 diff 就懂的修补，不写笔记。
- 事实写在 `docs/`。为什么、放弃过什么，写在 `.agents/notes/`。两边不要写成同一篇。
- 已落地的决定要改含义时，新增一篇笔记并互相链接。不要把旧笔记改写成相反结论。代码只是换了路径或名字时，更新原笔记里的事实。
- 不维护 `.agents/notes/INDEX.md`。笔记的位置就是它的状态和分类。
- 当前行为以 `docs/` 为准。

## 命令

```sh
pnpm install
pnpm db:up
pnpm dev
pnpm test
pnpm test:api
python3 scripts/verify_maintenance.py
```

步骤和门禁见 [本地运行](docs/cookbook/dev.md) 与 [测试](docs/cookbook/test.md)。

## 硬约束

- 题面以各题库包为准，应用不改写原题。见 [题库](docs/subsystems/bank.md)。
- 掌握等级、复习间隔和笔记长度只由 `@atlas/domain` 计算。见 [复习规则](docs/subsystems/domain.md)。
- 密钥放在环境变量。`.env` 不入库。见 [本地运行](docs/cookbook/dev.md)。
- 首个账号创建成功后关闭公开注册。见 [API](docs/subsystems/api.md)。
- 测试使用本机 `.env` 指向的库。见 [测试](docs/cookbook/test.md)。
- 推送到 `main` 后由 Woodpecker 构建并发布到生产。见 [发布](docs/cookbook/deploy.md)。

## 布局

```text
apps/web/                      React 复习界面
apps/api/                      NestJS API、会话和 PostgreSQL
packages/domain/               复习规则
packages/desk/                 题卡纯函数
packages/bank-architecture/    系统架构设计师题面
packages/bank-hcip/             HCIP AI 题面
src/                           静态站点
docs/                          当前行为：架构、子系统、操作、事故
.agents/notes/                 决定和被放弃的方案
scripts/                       文档门禁和发布脚本
```

界面规则在 [apps/web/AGENTS.md](apps/web/AGENTS.md)。接口语义在 [API](docs/subsystems/api.md)。这套文字分工的原因在 [笔记](.agents/notes/implemented/process/2026-11-01-docs-and-notes-split.md)。

## 改这些说明

每条保持一两行，并链接到它的家。变长时先把内容搬到所属的文档或笔记，再考虑提高 [scripts/doc-budgets.json](scripts/doc-budgets.json)。直接改 `AGENTS.md`；`CLAUDE.md` 只是指向本文件。
