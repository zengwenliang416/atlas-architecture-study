# 需求说明: study-layout

## Summary（摘要）

复习工作台和创建账号/登录屏一起收紧间距和层次。两屏继续使用现有浅色 token 和字体栈，不换组件库。复习工作台的大页眉改成一行顶栏。约 1280×800 时，不滚动就能同时看到题目目录和当前题目标题。登录表单在同一视口内完整可见，字段不变。题目卡内部的分区顺序不动。

## Users & Actors（用户与角色）

- 已登录的复习者。界面只有这一种角色。
- 首个账号尚未创建时，访客只看到创建账号屏。创建完成后，公开注册关闭。

## In Scope（本次范围）

- `StudyPage` 的页眉收成一行顶栏，标记留在 `StudyPage`，不新建页眉组件。
- 顶栏包含：品牌、掌握进度、退出、开始自测、今日复习，以及四个紧凑数字（收录、已掌握、待巩固、新学）。宽度大于等于 1100px 时这些内容保持一行。850px 到 1099px 可以换行，目录仍在题目旁边。
- 全部展开和只看题干留在题目区上方，不放进顶栏。焦点模式的原有键盘操作不变。
- 目录、间隔表和导出区的顺序不变。间隔表和导出仍在题目区之后。
- 宽度小于 850px 时，目录仍按现有规则改为可折叠单列，720px 以下仍保留底部 mobile dock。顶栏允许换行，不横向溢出视口。
- `SignInPage` 不新增顶栏。只减少 `auth-screen` 外的空白，使表单进入 1280×800 首屏。字段仍是称呼（仅首个账号）、邮箱、密码和提交。
- 视觉仍使用 `openspec/specs/ui-design/design.md` 里的浅色 token 和字体栈。改 CSS 之前，先把该规范的 Layout 节改成顶栏，不再把大页眉写成现状。
- 预计改动文件：`apps/web/src/styles/app.css`、`apps/web/src/styles/auth.css`、`apps/web/src/features/study/study-page.tsx`。登录屏标记不用动时，不改 `sign-in-page.tsx`。

## Out of Scope（不在本次范围）

- 不重排 `QuestionCard` 内部顺序：题干与选项、概念图、揭晓后的解析和论文、费曼三问、掌握程度条保持现状。
- 不改 39 道题目正文，不把题目放进数据库或 CMS。
- 不改 API、`study_record` 表、认证和注册关闭规则。
- 不引入 Ant Design、MUI、shadcn 或 Tailwind，也不新增暗色主题或语言切换。
- 不改变完成、笔记、掌握程度的请求字段和幂等规则。
- 不改快捷键规则，不改打印时隐藏目录、控制和笔记输入的行为。
- 不部署，不新增 Redis。

## UI Design Impact（界面设计影响）

- 项目规范来源： `openspec/specs/ui-design/design.md`
- 现状：复习页先是大页眉和整行四格指标，然后才是目录和题目。登录屏是居中的 `auth-card`。
- 已确认：两屏一起收紧。大页眉收成一行顶栏。约 1280×800 时目录和当前题目标题同时可见。登录表单在该视口内完整可见。题目卡内部分区本次不改。

## Theme & Locale Capability Impact（主题与语言影响）

- 主题能力： `light-only`
- 主题切换策略： 不提供。原型和页面都不放主题开关。
- 国际化： `disabled`
- 支持语言： 只有写死的 `zh-CN`
- 默认语言： `zh-CN`
- 原型需展示的范围： 浅色中文的创建账号/登录屏，以及登录后的复习工作台首屏。不展示主题或语言切换。

## Architecture & Database Impact（架构与数据库影响）

- 项目规范来源： `openspec/specs/system-architecture/design.md`
- 无新的架构或数据库决定。排版不得改 API、表结构或认证。

## Frontend-Backend Data Flow Impact（前后端数据流影响）

- 项目规范来源： `openspec/specs/frontend-backend-data-flow/design.md`
- 无新的数据流。揭晓、选中项、焦点题和侧栏折叠仍只留在浏览器。完成请求仍不携带本地 stage。

## Component Architecture Impact（组件架构影响）

- 项目规范来源： `openspec/specs/component-architecture/design.md`
- 继续使用 `SignInPage`、`StudyPage`、`QuestionCard` 和 `Toast`。`QuestionCard` 仍不自己请求 `/api`。
- 顶栏不提取成新组件。目录、指标和题目卡在被第二个页面使用之前不抽出。

## Unresolved Gaps（待确认事项）

- 无。
