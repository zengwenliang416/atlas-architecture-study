# 原型交互

用本机 Chrome 打开 artifact/index.html，逐个点击评审条上的操作。
每次点击后，对应结果文字都变成预期状态。

- 点击 show-setup：创建账号尚未打开 → 创建账号表单进入首屏
- 点击 show-login：登录尚未打开 → 登录表单进入首屏
- 点击 show-study：复习首屏尚未打开 → 目录和题目标题同时可见
- 点击 reveal-answer：解析尚未揭晓 → 解析和论文已揭晓
- 点击 mark-mastered：掌握程度尚未标记 → 本题已标记掌握
- 点击 show-wrap：中等宽度尚未打开 → 顶栏已换行且目录仍在题目旁
- 点击 show-narrow：窄屏尚未打开 → 目录已收成单列

项目页 http://127.0.0.1:5173/study 在未登录时只有登录表单，官方捕获返回 prototype-capture-project-shell-missing。
