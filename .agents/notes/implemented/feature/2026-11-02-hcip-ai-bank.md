# Agent Note: HCIP AI 题库和多选

Status: implemented

## Problem

复习台只有系统架构设计师一套题。HCIP AI 材料同时有填空、单选、多选，还有一节标题写成填空、题面却是对或错的判断题。单选的替换选择不能表达多选：少选会被当成另一道单选题。材料没有逐项释义，也没有按知识点绑在一起的题组。

## Decision

HCIP AI 题面放在 `@atlas/bank-hcip`，标识 `hcip`，页面上的名称是「HCIP AI」。[scripts/build-bank-hcip.mjs](../../../../scripts/build-bank-hcip.mjs) 从 `packages/bank-hcip/source.docx` 生成题目，编号 H1 到 H305。生成时只去掉答案两端空白，以及题干开头的制表符和误加的「【」。语义见 [题库](../../../../docs/subsystems/bank.md)。

后一节对错题记为判断题，按单选判。多选的答案字母用顿号写在同一空上。选中集合与答案集合一致才是对，少选、多选或错选整空记错。选项的对错样式仍按每个被选字母显示，不另计分。没有选项的填空沿用概念填空：交卷记 open，不进入错题，也不做字符串比对。逐项解析只显示选项原文和该不该选。同组辨析没有：材料没有共享的知识点分组，也没有选项理由。学习记录继续用 `study_record.bank_id`，不另建表。静态页把 HCIP AI 进度放在 `hcip_review_focused_notes_v1`。交卷队列、错题和对照沿用 [交卷队列、错题、草稿和月历](./2026-11-01-exam-queue-shared-desk.md)。

## Alternatives considered

把判断题当成填空。题面已经给出「对」和「错」，填空会把它们记成概念填空，交卷不分对错。

给多选做部分得分。材料没有部分分，错题筛选也只认整空的对、错、未答。

按学生写下的字符串给填空判对错。现有题卡对没有选项的空只记概念填空。字符串比对会新造一套判分。

给 HCIP AI 补写概念、口诀和选项理由。材料里没有这些句子。

## Consequences

系统架构设计师题面和 `src/data.js` 不动。掌握等级、间隔和笔记长度仍由 `@atlas/domain` 计算。一次交卷最多 320 道，盖住这 305 道整卷。`@atlas/bank-hcip` 的测试核对 42、94、78、91 和答案字母。`@atlas/desk` 的测试核对多选整组。三份 `desk.js` 仍是同一份文件。
