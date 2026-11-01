---
version: 1
name: Atlas 复习工作台
description: 现行复习工作台的视觉事实，取自 apps/web/src/styles/app.css。
colors:
  primary: "#1f46a5"
  secondary: "#525252"
  tertiary: "#737373"
  neutral: "#e4e4e7"
  background-100: "#ffffff"
  background-200: "#fafafa"
  gray-100: "#fafafa"
  gray-200: "#f4f4f5"
  gray-300: "#e4e4e7"
  gray-400: "#a1a1aa"
  gray-500: "#737373"
  gray-600: "#525252"
  gray-700: "#525252"
  gray-800: "#171717"
  gray-900: "#171717"
  gray-1000: "#171717"
  blue-700: "#1f46a5"
  red-800: "#9f2d2d"
  green-700: "#157a45"
typography:
  heading-32:
    fontFamily: Noto Serif CJK SC
    fontSize: 32px
    fontWeight: 500
    lineHeight: 40px
    letterSpacing: 0px
  heading-24:
    fontFamily: Noto Serif CJK SC
    fontSize: 22px
    fontWeight: 500
    lineHeight: 32px
    letterSpacing: 0px
  label-14:
    fontFamily: Noto Sans CJK SC
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  copy-14:
    fontFamily: Noto Sans CJK SC
    fontSize: 16px
    fontWeight: 400
    lineHeight: 26px
    letterSpacing: 0px
  button-14:
    fontFamily: Noto Sans CJK SC
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background-100}"
    typography: "{typography.button-14}"
    rounded: "{rounded.sm}"
    height: 36px
  button-secondary:
    backgroundColor: "{colors.background-100}"
    textColor: "{colors.gray-1000}"
    typography: "{typography.button-14}"
    rounded: "{rounded.sm}"
    height: 36px
  input:
    backgroundColor: "{colors.background-200}"
    textColor: "{colors.gray-1000}"
    typography: "{typography.copy-14}"
    rounded: "{rounded.sm}"
    height: 44px
---

# Atlas 复习工作台

## Overview（概览）

复习工作台是单页学习界面。视觉权威是 `apps/web/src/styles/app.css`，静态页使用同一套 `src/styles.css`。正文使用中文无衬线栈，题目标题、刊头和论文使用宋体栈。页面只有浅色。登录屏使用同一组 CSS 变量，样式在 `apps/web/src/styles/auth.css`。

## Colors（颜色）

表面用石墨中性色：页底 `#fafafa`，卡片 `#ffffff`，抬起 `#f4f4f5`，正文 `#171717`，次要 `#525252`，弱化 `#737373`。发丝线是正文色 8% 透明。`#1f46a5` 只用于「开始自测」和链接。`#9f2d2d` 只用于正在看的目录项左边线，以及揭晓后的答案左边线。`#157a45` 只用于已掌握。焦点环是 2px 墨色轮廓。

## Typography（字体）

`body` 的 `font-family` 是 Noto Sans CJK SC、PingFang SC、Microsoft YaHei、Noto Sans SC、system-ui。题目标题、刊头和论文使用 Noto Serif CJK SC、Songti SC、STSong。正文字号 16px。刊头标题 32px，字重 500。题目标题 22px，字重 500。界面字重是 400 和 500。小标签不用全大写，也不加宽字距。

## Layout（布局）

内容最大宽度 1440px，左右内边距 32px，窄屏 16px。页眉是一条短刊头：品牌、标题「对话题库复习」、一句说明、收录计数、开始自测和今日复习。视觉是刊头下面的真题，没有插画，也没有四张指标卡。1280×800 时目录和当前题目标题同时可见。题目区只挂当前一道题。目录在侧栏内部滚动。今天应复习的列表最多显示 13 条。小于 850px 时目录变成单列。小于 720px 时底部有上一题和下一题。揭晓后的解析留在纸色上，答案左侧是红线。当前目录项左侧是同一条红线。间隔和导出仍在题目区之后。登录和创建账号不另加顶栏。创建账号显示称呼；之后的登录是邮箱、密码和提交。打印仍隐藏目录、顶栏动作、模式按钮、控制和笔记输入。

## Elevation & Depth（层次与深度）

层次靠发丝线和表面台阶。主按钮没有投影。Toast 用很小的中性阴影。焦点用 2px 墨色轮廓。

## Motion（动效）

颜色、边框和按下时的微小缩放用 160ms，缓动是 `cubic-bezier(0.22, 1, 0.36, 1)`。悬停只换表面色。`prefers-reduced-motion: reduce` 时关掉过渡。加载、错误和提交中的状态不加装饰动画。

## Shapes（形状）

按钮圆角 8px，题目里的选项圆角 4px，卡片圆角 12px。品牌标记是文字 `a.` 加 Atlas。当前目录项是浅底加红色左边线。揭晓前的选中选项用墨色左边线。答案用红色左边线。回到顶部是方角小按钮。

## Components（组件）

主按钮是 `.action.primary`，次按钮是 `.action`，小按钮是 `.small-btn` 与 `.mini-btn`。输入是 `.search` 和费曼 `textarea`。题目是 `.q-shell`。目录项是 `.toc-item`。筛选是 `.filterchip`。掌握程度是 `.state-btn`。提示是 `#toast`。空状态是 `.empty`。没有表格组件、菜单组件或模态框。按钮必须是 `type="button"`，除非它提交表单。

## Voice & Content（文案与内容）

界面文案是简体中文。品牌是 Atlas 和系统架构设计师。按钮写出动作，例如「揭晓答案」「今天复习完」。错误用完整句子。题目正文来自题库，界面层不改写题目。

## Theme & Internationalization（主题与国际化）

- Theme capability：`light-only`。没有暗色变量，也没有 `prefers-color-scheme` 分支。
- Theme toggle：`none`。原型和页面都不要放主题切换。
- Internationalization：`none`。没有 i18n 运行时、语言包或 locale 路由。
- Supported locales：只有作者写死的 `zh-CN` 文案，没有第二种界面语言。
- Default locale：`zh-CN`。
- 原型规则：不要画主题开关或语言开关。

## Do's and Don'ts（使用约束）

- 沿用 `--accent`、`--ink`、`--muted`、`--pen`、`--good` 和现有字体栈。
- 焦点必须可见，正文与背景保持现有对比。
- 颜色状态同时配文字，例如掌握程度按钮有「新的 / 模糊 / 掌握」。
- 不要引入另一套组件库皮肤，也不要新增暗色主题。
- 不要为单个画面写与本文 token 冲突的字号、半径和色值；若排版调整需要新的间距节奏，先改这份规范再改 CSS。
