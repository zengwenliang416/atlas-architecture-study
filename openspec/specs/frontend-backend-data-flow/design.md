# Frontend-Backend Data Flow Spec

## Overview（概览）

浏览器通过同源 `/api` 访问 Fastify。登录态在 HttpOnly cookie。复习阶段、下一次日期和笔记以服务器行记录为准。揭晓、选中项、当前题和侧栏折叠只留在浏览器。

## Flow Index（流程索引）

| Flow ID | Trigger | Entry UI | API/Service | Persistence | User Result |
| --- | --- | --- | --- | --- | --- |
| `FLOW-SETUP` | 提交创建首个账号 | 登录屏 | `POST /api/setup` 然后 `POST /api/auth/sign-in/email` | `user`、`account`、`session` | 进入复习页；之后注册关闭 |
| `FLOW-SIGN-IN` | 提交登录 | 登录屏 | `POST /api/auth/sign-in/email` 与 `GET /api/me` | `session` | 显示复习工作台 |
| `FLOW-BANK` | 复习页加载 | 复习页 | `GET /api/banks/architecture` | 无，题目来自进程内 Git 数据 | 渲染 39 道题 |
| `FLOW-RECORDS` | 复习页加载 | 复习页 | `GET /api/study/records` | 读取 `study_record` | 指标、到期和每题状态 |
| `FLOW-COMPLETE` | 点击今天复习完 | 题目卡 | `POST /api/study/records/:id/complete` | 行锁更新阶段、次数和日期 | 按钮变为今日已完成，或提示当天已复习 |
| `FLOW-NOTES` | 笔记停止输入约 400ms | 费曼三问 | `PATCH /api/study/records/:id/notes` | 更新三列笔记和 version | 草稿与服务器 version 对齐；冲突时重载 |
| `FLOW-LEVEL` | 点击掌握程度 | 题目卡 | `POST /api/study/records/:id/level` | 更新 level 和 version | 按钮状态变化，复习日程不变 |
| `FLOW-IMPORT` | 点击导入本机旧笔记 | 导出区 | `POST /api/study/import` | upsert 已知题目 | 提示导入条数和忽略条数 |

## Boundary Contracts（边界约定）

- UI event contract：按钮使用明确动作。完成不携带本地计算的下一阶段。
- Client state contract：Query 缓存保存记录。reducer 保存揭晓、筛选、焦点、填空、论文案例和侧栏。
- Request schema：笔记是长度为 3 的字符串和整数 version。掌握程度是 `new`、`vague` 或 `mastered` 加 version。题目 id 匹配 `Q` 加数字。
- Response schema：学习命令返回领域记录。完成额外返回 `idempotent`。
- Error schema：`application/problem+json`，可读文案在 `detail`。
- Permission contract：无 cookie 时题库、记录和 `/api/me` 返回 401。

## State Ownership（状态归属）

- URL state：无。筛选和当前题不写入地址栏。
- Local component state：笔记草稿、输入焦点、防抖计时。
- Shared client cache：TanStack Query 中的会话、题库和记录。
- Server state：`study_record.version` 是笔记和掌握程度的乐观锁。
- Database state：阶段、复习次数、上次复习日、下一次复习日、三条笔记、掌握程度。
- Derived state：页面上的到期数和筛选结果用领域函数在浏览器计算，服务器到期列表是同一规则的持久行视图。

## Validation Ownership（校验归属）

- Client-side validation：登录密码至少 8 位。笔记在发送前保持三条字符串。
- Server-side validation：zod 拒绝非法邮箱、短密码、坏的 version、超长笔记和未知题目。
- Database constraints：用户邮箱唯一，学习记录三元组唯一，外键级联。
- Cross-field or cross-entity rules：完成时用上海日期比较 `lastReviewedOn`。新阶段决定间隔，封顶 6。
- Error copy source：API 的 `detail`。浏览器不另写一套业务规则文案。

## Error & Empty States（错误与空数据）

- Empty state：没有学习行时，记录按空记录出现，version 为 0，下一次日期是今天。
- Permission denied：401，文案「请先登录」。注册关闭是 403。
- Validation error：400，说明邮箱、笔记或题目编号无效。
- Network error：登录屏显示 API 未连上。复习页动作用 toast 显示失败。
- Server error：5xx 为 problem+json。锁等待或语句超时映射为 503。
- Conflict/stale data：笔记或掌握程度 version 不一致时 409，客户端作废缓存并重新加载。

## Loading / Optimistic / Retry Behavior（加载、乐观更新与重试）

- Initial loading：会话、题库和记录未返回前不渲染题目操作。
- Partial loading：题库和记录分开请求。
- Optimistic update：不在本地增加阶段，也不在 409 之前假定笔记已保存。
- Retry rule：Query 的网络重试为 1。完成和笔记失败不自动连发。
- Cancellation rule：笔记请求进行中时，新的草稿排队到当前请求结束后再送。
- Idempotency rule：同一上海日重复完成不增加阶段、次数或 version。
- Rollback rule：完成失败时数据库事务回滚，客户端保留原缓存。已经成功的当天完成不会被第二次点击撤销。笔记冲突不把另一端已保存的内容回滚成本地草稿。

## End-to-End Flow Details（端到端流程细节）

### FLOW-COMPLETE

1. 用户在焦点或展开的题目上点击复习完成。
2. 按钮进入提交状态。界面阶段数字先不变。
3. Request 只有路径中的题目 id，没有本地 stage。
4. 服务确认题目存在，插入空行或锁住已有行，再调用领域函数。
5. 若 `lastReviewedOn` 不是今天，阶段加一后取间隔，写入复习日和下一次日期。
6. Response 含新记录和 `idempotent`。
7. 缓存替换该题。当天已完成的按钮禁用。
8. 同一天再次点击由服务返回幂等结果，不回滚已完成的那一次。
9. 失败时保留原缓存，并用 toast 说明。
10. 日志沿用请求 id，没有单独审计事件。

### FLOW-NOTES

1. 用户编辑三条笔记之一。
2. 草稿标为脏，约 400ms 后发送当前三元组。
3. Request 带上次看到的 version。
4. 服务校验长度，并按 version 更新。
5. 只写笔记列和 version，不改阶段。
6. Response 带回新 version。
7. 若输入仍脏，再送最新草稿。
8. Retry 不自动进行。409 时重新读取记录。
9. 冲突不覆盖用户正在输入的另一台客户端结果。
10. 无额外日志字段。

## Async / Realtime Flows（异步与实时流程）

- Queue/event source：没有队列。
- Subscriber：没有。
- Retry/dead-letter behavior：没有后台重试。
- Realtime update channel：没有。多端同时编辑靠 version 冲突发现。
- Consistency expectation：完成在单行锁内决定。读请求不使用缓存副本代替数据库。

## Flow Do's and Don'ts（流程约束）

- 新的学习行为要能指向上面的 `FLOW-` 编号，或先在本文件增加编号。
- 加载、空、错误、禁用和未登录都要有可见结果。
- 不要在浏览器里计算下一间隔再提交。
- 不要把揭晓和选中项写入 `study_record`。
- 排版变更不得改变这些请求和响应的字段含义。
