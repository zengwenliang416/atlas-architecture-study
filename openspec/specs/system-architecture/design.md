# System Architecture & Database Spec

## Overview（概览）

Atlas 是单用户复习工作台。题目在 Git 里，学习记录在 PostgreSQL。服务器决定上海日历。浏览器只保存揭晓、选择、当前题和输入草稿这类短暂界面状态。`src/` 与根目录 `dist/` 是旧的静态站点，不是 `pnpm dev` 的运行入口。

## Application Topology（应用拓扑）

- Frontend runtime：`apps/web`，React 19 与 Vite，开发端口 5173。
- Backend runtime：`apps/api`，NestJS 12，HTTP 用 FastifyAdapter，端口 3102。
- API gateway or edge layer：开发时 Vite 把 `/api` 代理到 3102，`changeOrigin` 为 false。生产形态是同一域名，nginx 提供静态文件并代理 `/api`。压缩放在 nginx。
- Background workers：没有。
- External services：没有第三方登录、邮件或对象存储。
- Local development entrypoints：`pnpm db:up` 启动 PostgreSQL 17，端口 54329；`pnpm dev` 先构建 `@atlas/domain`，再并行启动 API 与 Vite。
- Production deployment shape：一台 VPS 上的静态资源加一个 API 进程。不使用粘性会话。第二台 API 出现之前不引入 Redis。

## Module Boundaries（模块边界）

- UI modules：`apps/web` 的登录屏、复习页、题目卡、短暂界面状态。
- Domain modules：`packages/domain` 的上海日历、复习间隔、掌握程度、笔记校验、旧记录归一化。
- Application/service modules：`apps/api` 的认证、题库读取、学习记录命令。
- Infrastructure modules：Drizzle、`pg` 连接池、Better Auth、Docker Compose 中的 PostgreSQL。
- Shared libraries：`packages/bank-architecture` 只导出 39 道题和 `BANK_ID`。

`packages/domain` 的 responsibility 是纯复习规则。它的 public contract 是命名函数，不接触数据库或 DOM。owned data 没有。dependencies 只有 zod。forbidden dependencies 包括 Nest、Fastify、React 和 `pg`。extension points 是新的纯函数，不把日历改回宿主机本地时区。

`packages/bank-architecture` 的 responsibility 是题目正文。public contract 是 `DATA` 与 `BANK_ID`。owned data 是 Git 中的题目。dependencies 是领域类型。forbidden dependencies 是学习记录和用户表。extension points 是另增题库包，不改这 39 题的措辞。

`apps/api` 的 responsibility 是认证和学习记录。public contract 是 `/api/*`。owned data 是用户、会话和学习记录行。dependencies 是 domain、bank、Drizzle 和 Better Auth。forbidden dependencies 是浏览器存储和另一套 HTTP 框架。extension points 是新的命令，仍由领域函数决定阶段和间隔。

`apps/web` 的 responsibility 是呈现和收集操作。public contract 是页面状态和 `/api` 调用。owned data 没有持久记录。dependencies 是 domain、bank 和 TanStack Query。forbidden dependencies 是直接写 PostgreSQL，以及在本地递增复习阶段。extension points 是同一视觉系统内的排版，不更换数据所有权。

## Frontend Architecture（前端架构）

- Routing：没有前端路由器。登录与复习由 `GET /api/me` 的结果切换。
- Rendering mode：Vite 构建的客户端渲染 SPA。
- State management：服务器记录用 TanStack Query。揭晓、筛选、焦点题、填空下标、论文案例和侧栏用页面内 reducer。
- Form handling：登录表单受控。笔记本地草稿防抖约 400ms 后提交整组三条和 version。
- Data fetching：`credentials: 'include'` 的 fetch。题库带 ETag。
- Error handling：problem+json 的 `detail` 显示为错误。409 重新拉取记录。
- Design system source：`apps/web/src/styles/app.css` 与 `auth.css`，见 `openspec/specs/ui-design/design.md`。

## Backend Architecture（后端架构）

- API style：JSON over HTTP。错误为 application/problem+json。
- Request validation：领域包里的 zod schema。环境变量在启动时用 zod 校验。
- Auth/session model：Better Auth 邮箱密码，HttpOnly cookie。公开注册路由返回 403。第一个账号只走 `POST /api/setup`，并用会话级 advisory lock。
- Domain service boundaries：阶段、间隔、笔记合法性只在 `packages/domain` 计算。API 负责锁、版本和持久化。
- Background jobs：没有。
- File/object storage：没有。
- Observability：Fastify 的 pino 与请求 id。没有独立指标系统。

## API Surface（接口范围）

| Route or RPC | Owner | Input | Output | Auth | Side Effects |
| --- | --- | --- | --- | --- | --- |
| `GET /api/health` | api | 无 | `{ ok: true }` | 公开 | 执行 `select 1` |
| `GET /api/setup/status` | api | 无 | `{ registrationOpen }` | 公开 | 无 |
| `POST /api/setup` | api | 邮箱、密码、可选称呼 | `{ ok: true }` 或 403 | 公开，限流 | 仅在用户表为空时创建第一个账号 |
| `GET /api/me` | api | cookie | 用户 id、邮箱、称呼 | 登录 | 无 |
| `GET /api/banks/architecture` | api | 可选 `If-None-Match` | 题库 JSON 或 304 | 登录 | 无 |
| `GET /api/study/records` | api | `bankId` | 今天、39 条记录、到期题 | 登录 | 无行的题目按空记录合并 |
| `GET /api/study/due` | api | `bankId` | 到期题目 id | 登录 | 无 |
| `PATCH /api/study/records/:id/notes` | api | version 与三条笔记 | 记录或 409 | 登录 | 更新笔记和 version |
| `POST /api/study/records/:id/level` | api | version 与 level | 记录或 409 | 登录 | 只改掌握程度 |
| `POST /api/study/records/:id/complete` | api | 无业务字段 | 记录与是否幂等 | 登录 | 行锁后按上海日推进阶段 |
| `POST /api/study/import` | api | 旧记录对象 | imported 与 ignored | 登录 | 只 upsert 已知题目 |
| `/api/auth/*` | api | Better Auth 请求 | 会话 JSON 与 Set-Cookie | 公开，登录限流 | 会话与账号表；`/sign-up` 固定 403 |

## Database Model（数据库模型）

| Entity | Purpose | Owner | Fields | Relationships | Indexes | Constraints | Lifecycle | Migration | Retention/Deletion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `user` | 账号 | api auth | id、name、email、emailVerified、image、createdAt、updatedAt | 拥有 session、account、study_record | email 唯一 | 主键文本 | 首个账号由 setup 创建 | `apps/api/drizzle/0000_init.sql` | 删除用户时级联删除会话、账号和学习记录 |
| `session` | 登录会话 | api auth | id、expiresAt、token、createdAt、updatedAt、ipAddress、userAgent、userId | 属于 user | token 唯一，userId 索引 | token 唯一，userId 外键 | Better Auth 创建和续期 | 同上 | 随用户删除 |
| `account` | 密码凭据 | api auth | id、accountId、providerId、userId、password、令牌字段、时间 | 属于 user | userId 索引 | userId 外键 | 注册时写入密码哈希 | 同上 | 随用户删除 |
| `verification` | Better Auth 校验材料 | api auth | id、identifier、value、expiresAt、时间 | 无用户外键 | identifier 索引 | 主键 | 认证流程使用 | 同上 | 过期后可由认证库清理 |
| `study_record` | 一题的复习记录 | api study | level、stage、reviewCount、lastMarkedAt、lastReviewedOn、nextReviewOn、note0/1/2、version | 属于 user，逻辑上对应题库 questionId | `(userId, bankId, nextReviewOn)` | `(userId, bankId, questionId)` 唯一 | 首次完成或保存时插入，之后按 version 或行锁更新 | 同上 | 随用户删除；不因题库缺行而删除其他题 |

连接池最大 10。`statement_timeout` 5000ms，`lock_timeout` 2000ms。学习记录的时间戳带时区，认证表的时间戳不带时区，与 Better Auth 1.7 的生成结果一致。

## Permissions & Security（权限与安全）

- User roles：只有登录用户。没有管理员角色。
- Permission checks：题库和学习记录要求会话。健康检查和 setup 状态公开。
- Data isolation：学习记录查询和更新都带 `userId`。
- Secret handling：`BETTER_AUTH_SECRET` 与数据库口令只在环境变量。开发口令留在 `.env`，不写入规范正文。
- Audit logging：请求日志有 request id。没有单独审计表。
- Abuse cases：setup 与登录有进程内限流。这只保护单实例。

## Integration Boundaries（集成边界）

- Third-party APIs：没有。
- Webhooks：没有。
- Queues：没有。
- Email/SMS/push：没有。
- Payments：没有。
- Analytics：没有。

## Operational Constraints（运行约束）

- Performance constraints：单 API 进程。题库 JSON 可按 ETag 返回 304。学习记录不做服务端缓存。
- Availability expectations：本地和单机 VPS。数据库不可用时健康检查失败。
- Migration rules：Drizzle journal 在 `apps/api/drizzle`。启动前执行迁移。
- Backup/restore：当前没有自动备份任务。
- Feature flag rules：没有旗标系统。
- Rollback constraints：应用回滚不自动回滚已执行的 SQL。

## Architecture Do's and Don'ts（架构约束）

- 复习算术留在 `packages/domain`，并在行锁内调用。
- 同一上海日的完成只生效一次。
- 掌握程度不改变阶段和下一次日期。
- 不要把题目搬进数据库或 CMS。
- 不要让浏览器自己增加 stage。
- 不要为了排版调整改 API、表结构或认证。
