# Agent Notes

这里只放代码和 `docs/` 装不下的决定：为什么这样、放弃过什么。当前行为写在 [docs/](../../docs/architecture.md)。本文件规定笔记放在哪、什么时候写、文件长什么样。

## 路径

路径是 `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`。

- `proposed/`：还没落地的方案。
- `implemented/`：已经随代码落地。正文用陈述句写当前事实。路径、名字或结构变了，就在同一次改动里改这篇笔记的事实，不改决定本身。见 [implemented/AGENTS.md](implemented/AGENTS.md)。
- `rejected/`：方案被否决。只在它还能阻止一次会重复发生的错误时保留，否则删掉。
- `archived/`：决定已经完成历史任务，后文不太会再指导修改。封存后整篇冻结，不能把它当成当前依据。

分类是闭合的：

| 目录 | 内容 |
|---|---|
| `feature` | 用户看得到的能力 |
| `bug-fix` | 纠正缺陷 |
| `simplification` | 去掉行为或代码，不增加能力 |
| `architecture` | 发出去的代码怎么分层、边界在哪 |
| `process` | 工具链、门禁、仓库流程 |
| `testing` | 测试策略和测试设施 |

`architecture` 是发出去的代码。`process` 是代码周围的工具和流程。

文件名里的日期是这个题目第一次写下来的日期。笔记之间用相对链接，不用口头提一句就算引用。

活跃笔记看目录或搜索仓库。不要添加 `INDEX.md`。总索引会在并行分支上互相冲突，也和路径里已经有的状态重复。

## 什么时候写

同一次改动里新增或更新笔记，只为了记下代码、测试和现有文档解释不了的决定。大改动的方案先放 `proposed/`。决定已经落地就直接放 `implemented/`。

已有笔记能覆盖这次决定时，更新那一篇，不另开一篇重复的。机械改动不写，包括局部界面表现、格式化、无歧义重命名，以及单文件里看 diff 就懂的修补。

一篇 `implemented/` 笔记不能被改写成另一个决定。要换决定，就新写一篇，并互相链接。旧笔记若被完全接替，可以在新笔记里保留每一条独特的理由、备选、后果和验证方式之后删除；只接替一部分时，两篇都留着。

## 文件格式

`python3 scripts/verify_maintenance.py` 检查格式。

前三行固定是：

```markdown
# Agent Note: <标题>

Status: <状态>
```

然后空一行。`Status:` 必须和所在目录一致：

- `Status: proposed`
- `Status: implemented`
- `Status: rejected — <一行原因>`

状态行不写日期，也不加括号。日期在文件名里。

正文第一节是 `## Problem`。

`proposed/` 依次包含 `## Problem`、`## Proposal`、`## Alternatives considered`、`## Acceptance criteria`、`## Risks`。中间可以有专节。

`implemented/` 依次包含 `## Problem`、`## Decision`、`## Alternatives considered`、`## Consequences`。中间可以有专节。禁止出现 `## Proposal`、`## Plan`、`## Migration plan`、`## Acceptance criteria`。

`rejected/` 保留被否决时的方案正文。`Status:` 行上的原因就是结论。仍然要有 `## Problem`、`## Proposal` 和 `## Alternatives considered`。

`## Alternatives considered` 每篇都要有。每个真实备选单独成段，写明为什么没采用。没有真实备选时写「无」，不要编一个。

从 `proposed/` 挪到 `implemented/` 时，同一改动里改 `Status:`，把 `## Proposal` 改成陈述句的 `## Decision`，把验收和风险收进 `## Consequences`。
