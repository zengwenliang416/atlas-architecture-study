# API

`@atlas/api` 是 NestJS 12，跑在 Fastify 上。开发时监听 `PORT`，默认 `3102`。数据库连接用 `DATABASE_URL`。

会话用 better-auth。`POST /api/setup` 只创建首个账号；该账号存在之后，同一接口拒绝后续注册。学习记录按登录用户写入 PostgreSQL。间隔和笔记长度交给 `@atlas/domain`，题面按 `bankId` 从 `@atlas/bank-architecture` 或 `@atlas/bank-llm` 读取。`POST /api/study/attempts` 写入交卷的逐空结果。`PATCH /api/study/records/:questionId/essay` 写入论文草稿。两者都带版本号，不推进间隔。

本机开发里，`WEB_ORIGIN` 若是 `localhost` 或 `127.0.0.1`，另一侧回环主机名也算可信来源。密钥只来自环境变量。
