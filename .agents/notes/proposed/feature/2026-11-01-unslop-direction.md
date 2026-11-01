# Agent Note: 复习界面的去模板化方向

Status: proposed

## Problem

系统架构设计师复习产品有两张给人看的脸，皮肤却是同一套编辑部模板。部署到 Sites 的静态页（`src/`、`dist/`）用轨道图、全大写眉题和四张等宽指标卡开场。登录后的 React 工作台（`apps/web`）已经收成一条学习顶栏，题目、间隔和导出仍继承那套皮肤，揭晓后又整块铺上荧光笔黄。颜色、字号、图标和文案都在抢题目本身。题干、选项、口诀和论文正文是题库，不能为了好看改写。

这次只定方向。样式、文案和题目渲染都还没动。

方法来自 Damir Sokolovsky 的 unslop（[@heydamir](https://x.com/heydamir)，[仓库](https://github.com/heydamir/unslop)，CC BY 4.0）。

## Proposal

整产品是重 slop。登录、创建账号、接口失败是轻的。论文栏是最接近成品的一块。确认这五句之前，不做九遍修改。

- **Product.** A review desk for candidates sitting the Chinese System Architect exam: one real question at a time, the answer hidden until they commit, then a four-part explanation, a paper to read when the item is an essay, Feynman notes, and a spaced return.
- **Character.** exact, patient, slightly stern
- **World.** An exam desk: scratch paper, blue-black printed ink, a red marking pen. Surfaces stay paper-neutral. The documented ink `#1f46a5` is the accent and is used rarely. Red is only the pen that marks the answer.
- **Moments.** The revealed answer line, marked like a grader's pen. The concept chain of the current question, drawn as a short diagram on the sheet. When the item is a paper, the essay column is the other moment.
- **Signature.** A short red margin rule on the question currently under review, in the index and beside the revealed answer, and nowhere else.

`#1f46a5` 和题目标题的宋体栈是已经写进规格的选择，方向围着它们长，不换成另一套流行色。轨道图、渐变字和发光都不算品牌。

### 看过的表面

静态页用 `dist/index.html` 在浏览器里点过：首屏、蒙住的选择题、揭晓后的答案和概念链、选项解析、口诀和费曼三问、间隔表、空搜索、论文题 Q22 蒙住和揭晓、390 宽。React 没有装依赖，也没有起 API。登录、创建账号、连接失败，以及学习顶栏，是用 `apps/web/src/styles/` 的真实样式表，套上静态页里那道真题的标记画出来的。学习顶栏的数字用的是新开本机记录的 0 / 39，不是编的进度。

没有单独的设置页、营销落地页或暗色主题。README 是给人看的产品说明，句子是事实，不是口号。

| 表面 | 程度 |
|---|---|
| 静态首屏、四指标、四个动作 | 重 |
| 题目卡（静态和 React 共用） | 重。React 揭晓后整段解析铺 `#fbda83` |
| 揭晓前的概念区 | 重，而且漏答案 |
| 论文栏 | 轻。阅读栏是对的，周围的蓝色标题和实心标签是装饰 |
| 间隔和导出 | 中。眉题、两张一样的卡、药丸间隔、导出渐变 |
| React 学习顶栏 | 轻。这已经是工作台该有的壳 |
| 登录、创建首个账号 | 轻 |
| 正在确认登录、暂时无法连接 API | 没有 slop |
| 空搜索 | 轻 |
| README | 没有 slop |
| 窄屏底栏 | 中。毛玻璃、胶囊「顶部」，和目录按钮叠在一起 |

静态页搜索会把模式改成「全部展开」。React 搜索仍只留当前一题，没有匹配时用同一句空状态。这是两套壳的行为差，不是另一套视觉方向。

### 重的理由

signs 里颜色、字、图标、文案、间距、组件、首屏、图形、动效都有命中，而且落在人每天盯着的题目上，不只是首屏。登录屏单独看可以只打磨。整产品不能当成轻 slop，否则静态首屏和题目皮肤会留下。

下面每一条都是页面上看得到的，或是最后一条生效的样式。`src/styles.css` 开头那一段和 `app.css` 里被学习顶栏盖住的选择器不是当前样子。

### 颜色和表面

- 首屏插画背后有一块模糊的蓝色径向渐变。`src/styles.css` 的 `.hero-art:before`。
- 模式条是蓝到白的线性渐变。`.welcome`。React 学习顶栏把这条盖成透明。
- 右侧概念纸有一道淡蓝线性渐变。`.zones > .paper:nth-child(2)`。
- 导出区是另一道淡蓝线性渐变。`.export`。
- 主按钮带着蓝色投影。`.action.primary` 的 `box-shadow`。
- `LOCAL FIRST` 旁边的绿点有一圈发光。`.online-dot`。它不是直播状态。
- 蓝色文字有一串近亲：标题、题号、链接、指标、按钮、概念名各自一个蓝。没有收成三种文字角色加一个点缀。
- 指标数字、题号、主按钮、今日到期、新学数字、眉题红字同时在喊。一屏里点缀不止一两处。
- 正确选项、答案条、新学数字、到期数字、眉题共用红色。红既是答案笔，又像错误，又像待办。
- React 揭晓后，`.q-shell:not(.only-masked) .revealed-only` 把第三区和第四区整块涂成 `#fbda83`。`apps/web/src/styles/app.css`。静态页没有这层黄。
- 窄屏底栏是毛玻璃。`.mobile-dock` 的 `backdrop-filter`。
- 没有紫色渐变，没有渐变字，没有霓虹描边。

### 字

- 标题字重 700 到 800。眉题还有 800。`.brandline`、`.hero-eyebrow`、`.side-title:before`、`.q-heading h2`。
- 小标签全大写加宽字距：`STUDY ATLAS`、`INDEX /`、`MEMORY / INTERVAL`、`FEYNMAN / EXPORT`、`TAKEAWAYS / 关键记忆`、`LEARN / TEST / RECALL`、`VOLUME 01 / Q01—Q39`、`LOCAL FIRST`、`ATLAS NO.01`。静态 `.brandline` 还有 `text-transform: uppercase` 和 `letter-spacing: .13em`。
- 首屏标题 `letter-spacing: -.065em`。题号小字也有负字距。`.brandmark`、题目 `h2` 里的题号。
- 同一屏有 Inter、宋体栈、Georgia 三套角色。宋体留给题目是方向要留的。Georgia 和 Inter 是模板在分指标、题号和眉题。
- 题号有的是 `Q1`，窄屏底栏是 `Q01`。指标用大号 Georgia，日期是 `2026-11-01`。
- 界面里没有用斜体做强调。

### 图标

- 按钮和状态用记号当图标：揭晓的 `↗`、遮挡的 `↶`、费曼的 `↘`、锁 `🔒`、对勾 `✓`、叉 `✕`、展开的 `＋`、只看题干的 `◌`、顶部的 `↑`。`src/controller.js` 的题目卡，以及 `apps/web/src/features/study/components/question-card.tsx`。
- 没有一套线图标，尺寸和颜色也不统一。
- ① 到 ⑧ 是四区学习法的区号，留着。它们不是导航装饰。
- 没有 ✨，没有「New」「PRO」「Beta」徽章。

### 间距

- 大量不在 4 的步长上：`5px`、`6px`、`7px`、`9px`、`11px`、`13px`、`15px`、`17px`、`19px`、`21px`、`23px`、`25px`、`27px`，以及指标的 `padding: 18px 23px 21px`、`min-height: 117px`。静态目录行高也不统一。React 目录行被收成 32px，长标题被省略号切掉。
- 四张指标卡等高、等分、同样的装饰圆。
- 筛选里「今日到期」单独掉到下一行，和「全部 / 不会 / 模糊 / 掌握」不是同一行高。
- 窄屏上胶囊「顶部」压住「展开目录」。
- 登录表单在视口里是一小块，周围空得很大。文案本身是轻的，空是轻的。

### 文案

- `✓ 回答正确！` 带叹号。题目卡的反馈句。
- `今天暂无到期题目，继续保持！` 带叹号。间隔区空状态。
- 搜索占位是「搜索题干、知识点或选项」。笔记占位是「写下自己的理解，自动保存……」。
- 论文题没有选项，预填区写的是「请先尝试在心里写出术语」，反馈句和锁仍写「请先选择一个选项」。`static-paper-masked` 里 Q22 就是这样。
- 英文眉题是任何学习产品都能用的架子。中文主标题「系统架构设计师 / 对话题库复习」是这一个产品的，文案那一遍要留。
- 「39 道」和题库数量一致，可以留，说轻一点。README 没有「万人喜爱」或「AI 驱动」。
- 没有欢迎回来之类的问候标题。

### 组件和首屏

- 今日复习的数字是一颗胶囊。`.action .btn-count`，`border-radius: 50px`。回到顶部是另一颗胶囊。
- 间隔七步每步一颗药丸，再用 CSS 在中间插箭头。
- 今天和以后是两张一样大的卡。
- 四张指标卡同一结构，右上角 `01`–`04`，背后一个装饰圆。
- 品牌标记在静态首屏是蓝底圆里的 `a.`。React 顶栏已经改成文字 `a.`，这一处是对的。
- 首屏插画是轨道、虚线圈和一条折线，图里写死了 `INPUT`、`MODEL`、`RECALL`、`RETAIN`、`4+1`、`UNDERSTAND / RETAIN / EVOLVE`。`4+1` 是题库里的视图模型（Q19），这里被当成徽章，没有五个视图。图里还有字，不是页面上的真字。
- 首屏动作有四个：开始自测、今日复习、全部展开、只看题干，再加上 `LEARN / TEST / RECALL`。React 顶栏已经收成一个实心按钮和两个文字按钮。
- 首屏是左右分栏，不是居中堆叠。分栏可以留。插画不能留。
- 揭晓前，`.only-masked` 藏起概念导语、流程图和节点说明，却没有藏 `.concept-takeaway`。Q1 的「题眼」和 Q22 的三问结构、New API 案例在作答前就出现在右栏。蒙层文案说揭晓后才解锁，画面不是这样。

### 动效

- 题目卡入场 `sheetEnter`，答案 `softReveal`。`.q-shell`。React 学习顶栏把题目卡的入场动画关掉了，答案动画还在。
- 按钮按下 `scale(.975)`，悬停上移 2px。选项悬停横移 3px。概念节点 `transition: all`，悬停上移 4px。
- `LOCAL FIRST` 的点是静态光环，不是 `animate-pulse`。没有视差。
- 已经有 `prefers-reduced-motion`。这一条留。

### 确认之后的九遍

两套壳一起改：`src/styles.css`、`src/body.html`、`src/controller.js`，以及 `apps/web` 的样式、`study-page.tsx`、`question-card.tsx`、`sign-in-page.tsx`。只改一边，Sites 上的静态页和登录后的工作台会再次分成两张脸。题干、选项、解析、口诀、论文段落、资料依据不改。不生成英雄图，不加故事视频，不动 API 和题库。

1. **Spacing.** 间距收到 4 的步长上。目录行同一个高度。组内紧、组外松。窄屏上「顶部」不再压住目录按钮。登录只收紧外空，不改成场景。
2. **Color.** 纸色中性色一套。`#1f46a5` 只留在主按钮、当前目录行和链接。红色只留在答案和签名那条边。新学数字和到期数字退出红色。去掉径向光、模式条渐变、导出渐变、概念纸渐变、蓝色按钮投影、绿点光环，以及整块 `#fbda83`。答案条可以留一条安静的红边，黄底不是那个时刻。
3. **Icons.** 按钮上的记号删掉，需要图标时用同一套线图标、同一尺寸和描边，颜色跟文字。① 到 ⑧ 留着。概念链上的箭头是图的连接，保留一种尺寸。
4. **Copy.** 去掉叹号。搜索改成「搜索」。笔记占位改短。英文眉题改成句子大小写，或删掉。没有选项的空，反馈句不再叫人「先选一个选项」。不改题库句子。`39` 道若保留，就写成安静的事实。
5. **Type.** 题目和论文继续用现有宋体栈。界面再留一个家族。字重 400 和 500，当前题号最多 600。小字不再加宽大写。计数和日期用等宽数字。底栏题号跟题库一样写 `Q1`，不写 `Q01`。
6. **Layout.** 登录后的壳维持「目录加一道题」，间隔和导出仍在题目后面。不把营销首屏装回工作台。静态首屏要么改成同一条学习顶栏，要么保留短分栏，但视觉必须是一道真题，不是轨道图。论文保持单栏阅读。目录长标题不要被 32px 省略号切到认不出考点。这一条要在改的时候看着真题决定。
7. **Details.** 圆角按嵌套算。计数改成安静的文字。间隔改成一条刻度，不再是七颗药丸。签名红边只出现在正在看的题。揭晓前的关键记忆真正藏起来，和蒙层文案一致。
8. **Visuals.** 删掉首屏 SVG。不生成图。丰富的地方是答案笔、概念链和论文栏。空状态继续用文字。
9. **Motion.** 去掉入场飞入、悬停上移、选项横移、节点的 `transition: all` 和按钮缩放。留下短的颜色变化，以及已经有的减少动效开关。一条缓动。

登录和连接失败在这些遍里只做打磨：字距、间距、品牌标记。不为它们发明场景。

## Alternatives considered

把整产品当成轻 slop，只擦 React 顶栏上剩下的记号。静态首屏仍是部署出去的那一页，题目皮肤两边共用。只擦顶栏，人打开 Sites 看到的还是轨道图和眉题。

另起一个世界，例如森林、星云或一张生成的建筑场景。方向必须从这一个产品来。这里的材料是考卷、红笔和论文栏。这一轮也不做付费生图。

这一轮就改 CSS。方向还没确认。换方向会把九遍全部重做。用户要求这一轮停在审计。

## Acceptance criteria

- 后续界面改动沿用上面五句，不把另一个产品的世界搬过来。
- 题干、选项、解析、口诀、论文段落和资料依据的文字保持题库原样。
- 静态页和 React 工作台一起改完九遍，登录和错误态只打磨。
- 揭晓前不再露出关键记忆里的题眼。
- 首屏不再使用带字的轨道图。
- 红色不再同时表示答案、新学和到期。
- 不改 API、数据库、题库内容，不生成故事视频。

## Risks

静态页和 React 各有一份题目渲染和一份长 CSS。只改一份，两张脸会再次分开。

藏起揭晓前的关键记忆会改变现在看得到的内容。蒙层文案已经承诺揭晓后才解锁，这一处是让画面跟上那句承诺。

静态首屏若改成学习顶栏，Sites 上的第一屏会变短。登录后的工作台已经是这个结构。要不要让静态页跟上，等确认。

红色现在同时标答案、到期和新学。收成笔迹之后，习惯了「红等于还没掌握」的人要改认绿色和墨色。规格里的蓝仍是点缀，不是整页的底。

宋体栈在没有 Noto Serif CJK 的环境会落到后备字体。保留现有的 Songti、STSong 和黑体后备，不把界面换成只有拉丁字母的家族。
