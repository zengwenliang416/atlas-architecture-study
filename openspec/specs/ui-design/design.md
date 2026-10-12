---
version: 1
name: Atlas 复习工作台
description: 现行复习工作台的视觉事实，取自 apps/web/src/styles/app.css 后段 editorial 规则。后段覆盖同名选择器。
colors:
  primary: "#1f46a5"
  secondary: "#69758d"
  tertiary: "#3260be"
  neutral: "#e1e7f0"
  background-100: "#ffffff"
  background-200: "#fbfbf9"
  gray-100: "#fbfbf9"
  gray-200: "#e1e7f0"
  gray-300: "#cbd7f0"
  gray-400: "#a5b3c5"
  gray-500: "#8a96aa"
  gray-600: "#69758d"
  gray-700: "#63718b"
  gray-800: "#39445c"
  gray-900: "#152039"
  gray-1000: "#152039"
  blue-700: "#1f46a5"
  red-800: "#d03e38"
  amber-700: "#f6e4a9"
  green-700: "#167e62"
typography:
  heading-32:
    fontFamily: Noto Serif CJK SC
    fontSize: 34px
    fontWeight: 700
    lineHeight: 46px
    letterSpacing: -2.2px
  heading-24:
    fontFamily: Noto Serif CJK SC
    fontSize: 24px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: -0.8px
  label-14:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 800
    lineHeight: 16px
    letterSpacing: 1.9px
  copy-14:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0.08px
  button-14:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 700
    lineHeight: 20px
    letterSpacing: 0.1px
spacing:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
rounded:
  sm: 7px
  md: 10px
  lg: 13px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background-100}"
    typography: "{typography.button-14}"
    rounded: "{rounded.sm}"
    height: 50px
  button-secondary:
    backgroundColor: "{colors.background-100}"
    textColor: "{colors.primary}"
    typography: "{typography.button-14}"
    rounded: "{rounded.sm}"
    height: 50px
  input:
    backgroundColor: "{colors.background-200}"
    textColor: "{colors.gray-1000}"
    typography: "{typography.copy-14}"
    rounded: "{rounded.sm}"
    height: 44px
---

# Atlas 复习工作台

## Overview（概览）

复习工作台是单页学习界面。视觉权威是 `apps/web/src/styles/app.css`。文件前段是旧样式，后段 editorial 规则覆盖同名选择器。正文使用 Inter 与中文无衬线回退，标题使用宋体栈，数字与题号使用 Georgia。页面只有浅色。登录屏使用同一组 CSS 变量，样式在 `apps/web/src/styles/auth.css`。

## Colors（颜色）

`--blue` `#1f46a5` 是主色，用于主按钮、链接和强调。`--ink` `#152039` 是正文。`--muted` `#69758d` 是次要文字。`--edge` 与 `--line` 是分隔和卡片边框。`--paper` 与白色是页面底。`--red` 表示答案、错误和间隔强调。`--green` 表示已掌握和复习完成。`--yellow` `#f6e4a9` 只作淡色点缀，不是警告色。焦点环是 `#edb56e`。选中文字背景是 `#cddcfa`。不要在功能里再写一套与这些变量无关的色板。

## Typography（字体）

`body` 的 `font-family` 是 Inter、Noto Sans CJK SC、PingFang SC、Microsoft YaHei、system-ui。页标题和题目标题使用 Noto Serif CJK SC、Songti SC、STSong。Georgia 只用于题号、指标数字、品牌标记和间隔标签。正文字号 16px，行高 1.74。页标题用 clamp，桌面最大约 67px。题目标题约 23px 到 30px。眉题和标签用 11px 到 12px 的大写字距。按钮继承正文字体，字号 14px，字重 700。

## Layout（布局）

内容最大宽度 1552px，左右内边距 `clamp(20px, 4vw, 76px)`，底部留出 95px。版面顺序是页眉、四格指标、模式控制、左侧目录加右侧题目、间隔表、导出。题目卡内部是左右两栏，再加费曼三问。断点来自同一份 CSS：1220、980、850、720、520、480。850px 以下目录改为可折叠的单列。720px 以下出现底部 mobile dock。打印时隐藏目录、控制和笔记输入。

## Elevation & Depth（层次与深度）

层次靠边框和留白，阴影很轻。卡片使用 `--shadow`。主按钮有蓝色投影。Toast 和回到顶部按钮有单独阴影。弹出层只有 toast，没有对话框系统。焦点用 3px 轮廓，不用阴影代替焦点。

## Motion（动效）

按钮、选项和概念节点使用约 0.22s 到 0.24s 的过渡，缓动是 `--ease`。题目卡入场约 0.48s。悬停时按钮和节点上移 2px 到 4px。`prefers-reduced-motion: reduce` 时关闭这些位移和入场。加载、错误和提交中的状态不加装饰动画。

## Shapes（形状）

控件半径约 7px 到 9px。题目卡 13px，目录 12px，指标条外框 13px。品牌标记和选项字母是正圆。筛选计数和回到顶部是胶囊。答案条和口诀用左边框，不用大圆角块。

## Components（组件）

主按钮是 `.action.primary`，次按钮是 `.action`，小按钮是 `.small-btn` 与 `.mini-btn`。输入是 `.search` 和费曼 `textarea`。题目是 `.q-shell`。目录项是 `.toc-item`。筛选是 `.filterchip`。掌握程度是 `.state-btn`。提示是 `#toast`。空状态是 `.empty`。没有表格组件、菜单组件或模态框。按钮必须是 `type="button"`，除非它提交表单。

## Voice & Content（文案与内容）

界面文案是简体中文。品牌短标签可以中英并列，例如 ARCH / ATLAS。按钮写出动作，例如「揭晓答案」「今天复习完」。错误用完整句子，例如「请先登录」。不使用玩笑或命令式责备。题目正文来自题库，界面层不改写题目。

## Theme & Internationalization（主题与国际化）

- Theme capability：`light-only`。没有暗色变量，也没有 `prefers-color-scheme` 分支。
- Theme toggle：`none`。原型和页面都不要放主题切换。
- Internationalization：`none`。没有 i18n 运行时、语言包或 locale 路由。
- Supported locales：只有作者写死的 `zh-CN` 文案，没有第二种界面语言。
- Default locale：`zh-CN`。
- 原型规则：不要画主题开关或语言开关。

## Do's and Don'ts（使用约束）

- 沿用 `--blue`、`--ink`、`--muted`、`--edge`、`--red`、`--green` 和现有字体栈。
- 焦点必须可见，正文与背景保持现有对比。
- 颜色状态同时配文字，例如掌握程度按钮有「新的 / 模糊 / 掌握」。
- 不要引入另一套组件库皮肤，也不要新增暗色主题。
- 不要为单个画面写与本文 token 冲突的字号、半径和色值；若排版调整需要新的间距节奏，先改这份规范再改 CSS。
