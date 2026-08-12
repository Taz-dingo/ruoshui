# 若水广场

## Context

默认只读 `docs/project/state.md`。仅在需要优先级时读 `tasks.md`；范围不清时读 README、`spec.md` 或 `plan.md`；部署、排障和验证时读 `engineering-memory.md`。`docs/archive/**` 只用于明确的历史问题。

## Work

- 保持迭代小而聚焦；新 feature 用分支，完成后优先经 PR 交付。
- UI 改动先读根目录 `design.md`；它是 viewer 的 agent 可读设计契约，外部 Apple 参考在 `docs/design/apple-reference/DESIGN.md`。
- 提交前检查改动、清除当前范围内的陈旧信息，并运行最小相关验证；临时 Vite 进程必须停止。
- 代码改动完成并通过最小验证后，默认立即部署到生产环境，并核对线上结果；只有用户明确要求不发布时才跳过部署。
- 每次代码或配置改动完成并通过最小验证后，立即创建聚焦 commit、push 当前分支并部署；若工作区有无关改动，只提交当前范围文件。
- 事实改变时更新最小的 active doc；已结束方向移入 archive。不要新增平行 handoff 文档。
- `web/` 的 TS/JS 模块采用文件末尾统一导出。

## On-demand skills

- 前端/Node 使用现有的全局 React、TypeScript 与 Node 能力。
- 3D viewer/runtime 用 `ruoshui-web-3d` 与全局 3D skills。
- Workers、D1、R2 和部署用 `ruoshui-cloudflare-workers`；部署操作同时使用官方 `cloudflare-deploy`。
- 只有编辑 gaussian 资产时才用 `ruoshui-supersplat`；训练工作流已归档。
