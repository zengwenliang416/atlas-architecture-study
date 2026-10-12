# Atlas 互动复习工作台：架构说明

## 目标

在不改变原始题库内容和学习流程的前提下，将单文件页面整理为可维护的静态前端。应用坚持本地优先：题目数据随代码发布，学习状态和费曼笔记只写入浏览器 `localStorage`，不依赖后端接口。

## 分层

- **数据层 `src/data.js`**：只保存题目、选项、概念图、解析和资料依据；不访问 DOM 或存储。
- **状态层 `src/storage.js`**：以 Repository 模式封装 `localStorage`，负责状态初始化、字段归一化、日期和间隔计算。
- **控制层 `src/controller.js`**：处理用户事件、筛选、导航、揭晓答案和复习推进；通过仓储读写状态。
- **视图层**：`index.html` 保留语义化页面骨架，`src/styles.css` 负责视觉系统和响应式布局，控制层使用纯函数 HTML 模板更新局部区域。

控制流采用单向更新：事件 → 状态变更 → `render*` 重绘 → DOM。

## 设计模式

1. **Repository**：`createStudyRepository` 隔离持久化介质，未来可以替换为 IndexedDB 或云同步而不改 UI 业务逻辑。
2. **State Machine**：题目状态固定为 `new / vague / mastered`，复习阶段由 `0..6` 的间隔表推进。
3. **Strategy（筛选策略）**：`matches` 将关键词、掌握程度和到期条件组合为可替换的筛选策略。
4. **Component-like Rendering**：`questionCard`、`conceptHTML`、`optionHTML` 等纯渲染函数按职责拆分，输入数据、输出 HTML。

## 规范

- ES Modules，单一职责，命名表达意图；无第三方运行时依赖。
- 所有用户输入在渲染前通过 `esc` 转义；按钮使用 `type="button"` 和可见焦点样式。
- 所有交互通过事件委托，避免为每道题重复注册监听器。
- 修改题库时只编辑 `src/data.js`；修改持久化协议时只编辑 `src/storage.js`。
