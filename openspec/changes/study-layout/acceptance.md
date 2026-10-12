# 验收标准: study-layout

## User-Visible Criteria（用户可见的验收条件）

- 创建账号/登录屏和复习工作台都保持浅色简体中文，不出现主题开关或语言开关。
- 桌面视口 1280×800：登录后不滚动就能同时看到题目目录和当前题目标题。
- 宽度大于等于 1100px 时，顶栏保持一行，能看到品牌、掌握进度、退出、开始自测、今日复习，以及收录、已掌握、待巩固、新学四个数字。页面上不再有独占首屏的大标题，也不再有单独占满一行的大号四格指标。
- 850px 到 1099px 时顶栏可以换行，目录仍在题目旁边。小于 850px 时目录仍可收成单列。720px 以下仍能看到底部题目切换。顶栏换行后不出现横向滚动条。
- 全部展开和只看题干出现在题目区上方，不在顶栏里。焦点模式下，输入框未聚焦时，原有的数字键、方向键和 Enter 仍可用。
- 1280×800 的创建账号屏能一次看到品牌、标题、称呼、邮箱、密码和提交。登录屏能一次看到品牌、标题、邮箱、密码和提交。
- 题目卡仍按现有顺序呈现题干与选项、概念图、揭晓后的解析和论文、费曼三问和掌握程度。
- 复习页仍可搜索、筛选、揭晓答案、标记掌握程度和点击今天复习完。

## System Criteria（系统验收条件）

- 改 `app.css` 或 `auth.css` 之前，`openspec/specs/ui-design/design.md` 的 Layout 节已经写成顶栏，不再把大页眉写成现状。
- 完成、笔记和掌握程度的请求路径与字段含义不变。
- 同一上海日重复完成仍只增加一次阶段。
- 公开注册在首个账号创建后仍然关闭。

## Data Criteria（数据验收条件）

- `study_record` 的列、唯一约束和 version 规则不变。
- 揭晓、选中项、焦点题和侧栏折叠不写入 `study_record`。

## Component Criteria（组件验收条件）

- 按 `component-impact-map.json` 复用 `SignInPage`、`StudyPage`、`QuestionCard` 和 `Toast`。
- 顶栏留在 `StudyPage`，不新增页眉组件。
- 不把 API client 放进 `QuestionCard`。
- 不补题目卡渲染快照。

## Verification Surfaces（验证范围）

- Facticity: 对照四份基础规范，以及 `study-page.tsx`、`question-card.tsx`、`sign-in-page.tsx`。
- Static: 变更落地后跑现有 lint 与类型检查。
- Unit: 领域测试和 API 完成并发测试保持通过。
- Redteam: 排版改动不得放宽登录要求或注册关闭。
- E2E: 登录后完成一次复习，同一天再次完成仍幂等。
- Sensory: 在 1280×800 和宽度小于 850px 的运行页面上查看登录屏和复习首屏。

## Unresolved Gaps（待确认事项）

- 无。
