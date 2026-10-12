# Component Architecture & Reuse Spec

## Overview（概览）

复习界面由登录屏、复习页和题目卡组成。题目卡是唯一的重界面组件。复习规则不放进组件，组件通过回调提交 level、complete 和 notes。

## Component Taxonomy（组件分类）

- Page/screen components：`SignInPage`、`StudyPage`。
- Layout components：复习页里的页眉、指标、目录、间隔表和导出区还写在 `StudyPage`，没有独立布局包。
- Domain components：`QuestionCard` 呈现一道题的题干、选项、解析、论文和费曼笔记。
- Form components：登录字段在 `SignInPage`。笔记框在 `QuestionCard`。
- Data display components：指标、目录项、到期列表。
- Feedback components：`toast`。
- Headless hooks：笔记防抖目前在 `QuestionCard` 内部，还没有独立 hook。
- Domain utilities/services：`packages/domain` 的日历、筛选和复习函数。`apps/web/src/shared/api/client.ts` 是唯一的 HTTP 边界。

## Cohesion Rules（职责集中规则）

- `QuestionCard` 的变更理由是一道题的呈现和笔记草稿。
- 复习阶段的加减留在领域函数和 API，不进组件。
- `StudyPage` 可以组合数据查询、筛选和布局。它不应再复制题目卡内部的选项和笔记逻辑。
- 组件 props 使用题目、记录和回调，不接收数据库行。

## Coupling Rules（依赖关系规则）

- 页面可以引用题目卡、toast 和 API client。
- `QuestionCard` 不引用登录页，也不发起自己的 Query。
- 领域组件可以依赖 `@atlas/domain` 的类型和纯函数。
- API client 不进入题目卡。笔记保存由页面传入的 `onNotes` 完成。
- `packages/domain` 不引用 `apps/web` 或 `apps/api`。

## Shared Component Extraction Rules（复用组件提取规则）

出现以下情况时再提取，而不是提前拆目录：

- 同一按钮、空状态或提示出现在两个屏幕。
- 同一状态机被登录以外的流程重复。
- 同一日期或答案摘要规则被两处手写。
- `StudyPage` 里一个区块已经同时负责查询、快捷键和另一种界面。
- 新代码复制 `.action`、`.q-shell` 或 `.state-btn` 的行为却另起一套标记。

排版调整优先改现有结构和 CSS。只有当目录、指标或题目卡需要被第二个页面使用时，才把它们从 `StudyPage` 抽出。

## Component Public API Rules（组件公开接口规则）

- `QuestionCard` 接收题目、记录、今天的日期、揭晓和选择状态，以及 level、complete、notes、reveal、pick 回调。
- 不把 `study_record` 的 SQL 列名暴露给组件。
- 回调名使用 `onLevel`、`onComplete`、`onNotes` 这类用户意图。
- 题目卡不用 children 插槽拼装题干。题干来自题目数据。

## State Ownership Rules（状态归属规则）

- Local state：笔记草稿、是否正在输入、未发送标记。
- Shared UI state：`study-reducer` 中的模式、焦点题、筛选词、揭晓列表、侧栏折叠、toast 文案。
- Server/cache state：Query 中的会话、题库、记录。
- Form state：登录邮箱、密码和称呼。
- URL state：不使用。
- Derived state：到期数量、可见题目和掌握百分比由记录与今天的日期计算。

## Composition Patterns（组合模式）

- Preferred composition patterns：`StudyPage` 拉取记录后把单题数据传给 `QuestionCard`。
- Forbidden composition patterns：题目卡内部再请求 `/api`；页面在本地执行 `completeReview` 后当作已保存。
- Approved provider/context boundaries：只有 TanStack `QueryClientProvider`。没有主题或语言 context。
- Approved headless hook patterns：若笔记防抖要被测试或复用，可以抽成 hook，但保存仍通过回调回到页面。

## File & Naming Conventions（文件与命名约定）

- Component file naming：`apps/web/src/features/<feature>/` 下的 kebab-case tsx。页面级组件可以用 `study-page.tsx`。
- Hook naming：`use` 前缀，放在使用它的 feature 内，直到第二个 feature 需要它。
- Test naming：领域测试在 `packages/domain/src/*.test.ts`。API 行为测试在 `apps/api/src/**/*.test.ts`。旧静态站测试留在 `tests/*.mjs`。
- Story/prototype naming：SpecNav 原型放在对应 change 的 `prototype/`，不放进 `apps/web`。
- Barrel/export rules：领域包用 `src/index.ts` 的命名导出。前端 feature 直接按文件引用，不建大桶文件。

## Testing Expectations（测试要求）

- Shared component tests：题目卡还没有组件测试。排版变更若只改 CSS，不为此补一套渲染快照。
- Hook tests：没有独立 hook 时不新增空测试。
- Integration tests：领域规则用 `node:test`。完成命令的并发由 API 测试覆盖。旧站点用 `tests/smoke.mjs` 与 `tests/startup.mjs`。
- Accessibility checks：按钮保留名字和 `type="button"`。焦点环保持可见。
- Visual/prototype review：排版结果由运行中的页面核对，不用虚构截图代替。

## Refactor Triggers（重构触发条件）

- Duplicate logic detected：两处各自实现笔记保存或到期判断。
- Cross-boundary import detected：`apps/web` 引用 `apps/api` 源码，或题目卡引用数据库类型。
- Props become data-source-specific：组件开始接收 Drizzle 行。
- Component grows multiple responsibilities：`StudyPage` 再混入第二种题库的数据模型。
- Test setup requires unrelated modules：领域测试需要启动浏览器或数据库。

## Component Do's and Don'ts（组件约束）

- 复习规则继续从 `@atlas/domain` 引用。
- 题目文本只用文本节点渲染，不用 HTML 注入。
- 新增共享组件前更新这一节的分类。
- 不要把 `StudyPage` 的快捷键和查询逻辑复制进题目卡。
- 不要为了排版把 API client 或 cookie 处理放进展示组件。
