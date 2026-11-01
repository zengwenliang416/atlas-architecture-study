# 复习规则

`@atlas/domain` 是纯函数包。它不访问数据库、网络和 DOM。

等级是 `new`、`vague`、`mastered`。间隔天数是 `0, 1, 2, 4, 7, 15, 30`，阶段不超过最后一档。笔记上限是 20000。常量在 `packages/domain/src/errors.ts`。完成复习、修改等级、替换笔记和筛选都从这里导出。

工作区的 API 和 Web 调用这个包。静态站点不引用它，间隔表另写在 [静态站点](static-site.md)。
