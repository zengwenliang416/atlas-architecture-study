# Agent Note: 事实、规则和取舍分开存放

Status: implemented

## Problem

复习应用的规矩、当前行为和被放弃的方案如果写在同一份长文里，新开的会话读不完，也会把过期方案当成还能做的设计。

## Decision

根 `AGENTS.md` 只留短规则并链到家。`docs/` 写当前行为，按架构、子系统、操作和事故分开。`.agents/notes/` 写为什么和放弃过什么。非平凡改动在同一次提交里更新拥有该决定的笔记。`python3 scripts/verify_maintenance.py` 检查字数、变迁用词、笔记骨架和相对链接。

## Alternatives considered

把全部规矩追加进根目录一份长文。规则一长，后续会话抓不住禁令，文档也会和代码一起腐化。

只保留 `openspec/`。它能描述进行中的改动，落地之后的行为和被放弃的方案没有固定的家。

## Consequences

常驻文档有字数上限。样式、格式化和单文件里看 diff 就懂的修补不写笔记。换一个已落地的决定时新增笔记并互相链接，不把旧笔记改成相反结论。
