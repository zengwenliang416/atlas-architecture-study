# AGENTS.md — 文档标准

人读的文档遵守本文件。Agent Notes 的格式在 [.agents/notes/README.md](../.agents/notes/README.md)，不套用这里的字数表。放置顺序：先确定这篇文档在树里的位置，再写它自己的主题，下层细节改成链接。

## 一篇事实一个家

| 位置 | 写什么 | 不写什么 |
|---|---|---|
| 根 [AGENTS.md](../AGENTS.md) | 每次开工都要看到的短规则，一条一两行，链到它的家 | 教程、例子、整段原理 |
| 子目录 `AGENTS.md` | 只属于该目录的规则 | 根文件已经写过的仓库级规则 |
| [architecture.md](architecture.md) | 分层、一次复习怎么穿过各层、产品边界 | 参数表、页面尺寸、决定过程 |
| [subsystems/](subsystems/README.md) | 一个子系统一页：当前语义 | 操作步骤、事故经过 |
| [cookbook/](cookbook/README.md) | 带验证步骤的操作 | 为什么这样设计 |
| [postmortem/](postmortem/README.md) | 事故经过，允许按时间写证据 | 日常功能说明 |
| [.agents/notes/](../.agents/notes/README.md) | 为什么、放弃了什么、代价是什么 | 把已落地的决定写成计划或验收清单 |

缺陷经过放 postmortem。原理放 Agent Notes。步骤放 cookbook。语义放子系统。常驻禁令放根 `AGENTS.md` 并链到笔记。

## 写法

- 写当前行为。变迁留在提交、Agent Notes 和 postmortem。`docs/` 与各级 `AGENTS.md` 禁止变迁用词。`scripts/verify_maintenance.py` 扫描时会跳过代码块，并拒绝下面这份词表：

```text
以前
现在
不再
曾经
原先
如今
尚未
previously
no longer
used to
formerly
```

- 不手抄会随代码腐烂的路由表、字段表和测试清单。契约写在对应子系统页，不另抄一张表。
- 一段一行。编辑器负责折行。代码块、表格和列表保持自己的格式。
- 一处写完事实，别处用链接。不要在两页各写一遍阈值或参数。
- 不在正文里标注「已实现」「未来才做」。有没有这条行为，看代码和测试。
- 注释和文档写约束、失败时怎样、谁拥有状态。不复述代码正在做什么，不把评审对话贴进来。

## 字数

[scripts/doc-budgets.json](../scripts/doc-budgets.json) 是常驻文档的上限。计数把每个汉字算 1，每个连续的英文、数字和路径片段算 1。`python3 scripts/verify_maintenance.py` 在超过上限、文件缺失或出现未登记的常驻文档时失败。

超限时按这个顺序处理：把不属于这一层的内容搬走，只留一行链接；还能缩短的就缩短；字数确实需要这么多时才提高上限，并在改动说明里写原因。上限不是越低越好。改上限时，让当前正文至少留下 5% 余量。

## 腐化清单

- 同一条规则出现两次：留一个家，其余改成链接。
- 用变迁口吻描述功能。
- 在架构或子系统页写进度和阶段。
- 把源码里已经有的符号表再抄一遍。
- 已落地的笔记里出现「应该」、迁移计划和验收清单。
- 满篇加粗。只强调会改变行为的那一句。
