# 若水广场

## Context

默认先读 `docs/project/state.md`。仅在需要优先级时读 `tasks.md`；范围不清时读 README、`spec.md` 或 `plan.md`；非平凡代码 / schema / 产品实现改动同时读 `docs/project/agent-collaboration.md`；部署、排障和验证时读 `engineering-memory.md`。`docs/archive/**` 只用于明确的历史问题。

重要跨模块设计、长期数据模型或容易被未来 Agent 重新争论的取舍，读 `docs/decisions/**`；不要把 decision rationale 复制进多个 active docs。

## Work

- 保持迭代小而聚焦；新 feature 用分支，完成后优先经 PR 交付。
- 人负责产品意图、架构边界、关键 invariant 和验收；Agent 可自由选择实现细节，但不得静默扩大 scope 或改变 contract。
- 能机械判断的重要规则优先变成类型、schema、test 或 script gate，不长期只依赖 prompt / prose。
- UI 改动先读根目录 `design.md`；它是 viewer 的 agent 可读设计契约，外部 Apple 参考在 `docs/design/apple-reference/DESIGN.md`。
- 提交前运行覆盖当前修改面的最小相关验证；用户可见流程至少走一次真实入口 / 真实副作用的 smoke，不能只相信自报成功。临时 Vite 进程必须停止。
- 代码改动完成并通过最小验证后，默认立即部署到生产环境并核对线上结果；只有用户明确要求不发布时才跳过部署。
- 每次代码或配置改动完成并通过最小验证后，立即创建聚焦 commit、push 当前分支并部署；若工作区有无关改动，只提交当前范围文件。
- One fact, one home：事实改变时更新最小 owner doc；不要为了 Agent context 在 README、AGENTS、spec、state 中复制同一事实。已结束方向移入 archive；不要新增平行 handoff 文档。
- 新 abstraction / config / fallback 必须有当前真实 consumer；优先复用已有 seam，避免为“以后可能有用”扩展架构。
- `web/` 的 TS/JS 模块采用文件末尾统一导出。

## On-demand skills

- 前端/Node 使用现有的全局 React、TypeScript 与 Node 能力。
- 3D viewer/runtime 用 `ruoshui-web-3d` 与全局 3D skills。
- Workers、D1、R2 和部署用 `ruoshui-cloudflare-workers`；部署操作同时使用官方 `cloudflare-deploy`。
- 只有编辑 gaussian 资产时才用 `ruoshui-supersplat`；训练和自研 streamed SOG 工作流已归档，不主动重启。
