## Skills
### Available skills
- ruoshui-resume: Recover project background, current status, open tasks, and next-step plan for 若水广场. Use when the user says “继续”, “接着做”, “resume”, or starts a new thread without full context. (file: ./.codex/skills/ruoshui-resume/SKILL.md)
- ruoshui-project: Preserve current project scope, iteration rhythm, and delivery rules for 若水广场. Use for planning, scoping, documentation, saving current progress, preparing handoffs, and general implementation in this repo. (file: ./.codex/skills/ruoshui-project/SKILL.md)
- ruoshui-cleanup: Run the repo’s pre-commit cleanup pass for 若水广场. Use before every commit-sized delivery to sync docs, remove stale or dirty info, clean obvious dead code, and run the smallest relevant validation. (file: ./.codex/skills/ruoshui-cleanup/SKILL.md)
- ruoshui-asset-poc: Handle raw asset inventory, duplicate-name rules, PoC subset selection, and 3DGS feasibility workflow. Use for any task touching `assets/raw`, `data/asset_inventory.json`, `data/poc-001-files.txt`, or related docs. (file: ./.codex/skills/ruoshui-asset-poc/SKILL.md)
- ruoshui-react-vercel: Frontend专业 skill。用于 `web/` 下的 React / TSX / 状态 / 加载体验 / 渲染性能 / bundle 调整，吸收 Vercel React best practices。 (file: ./.codex/skills/ruoshui-react-vercel/SKILL.md)
- ruoshui-web-3d: Web3D 专业 skill。用于 `PlayCanvas/SOG` viewer runtime、相机、点位、小地图、空间投影、交互与性能调优。 (file: ./.codex/skills/ruoshui-web-3d/SKILL.md)
- ruoshui-supersplat: SuperSplat 专业 skill。用于 gaussian 资产清理、选择/删除、导入导出、`.ssproj`、`.ply/.splat/.sog` 格式判断与交付前处理。 (file: ./.codex/skills/ruoshui-supersplat/SKILL.md)
- ruoshui-node-mcollina: 后端通用专业 skill。用于 `services/forum-api/`、`packages/shared/`、Node 侧脚本与 backend 架构调整，吸收 Matteo Collina 与 Node 官方最佳实践。 (file: ./.codex/skills/ruoshui-node-mcollina/SKILL.md)
- ruoshui-cloudflare-workers: Cloudflare 专业 skill。用于 Workers / D1 / R2 / `wrangler.toml` / migrations / bindings / deploy 相关工作。 (file: ./.codex/skills/ruoshui-cloudflare-workers/SKILL.md)

## How to use skills
- Use `ruoshui-resume` first when the user says “继续”, “接着做”, or opens a fresh thread with little context.
- Use `ruoshui-project` by default for work in this repo unless the task is purely mechanical.
- Also use `ruoshui-project` when the user asks to save progress, record current status, or prepare a handoff.
- Use `ruoshui-cleanup` before every commit-sized delivery, even when the change looks doc-only or “just a small cleanup”.
- Also use `ruoshui-asset-poc` when the task involves image assets, PoC sampling, or first-pass 3DGS validation.
- 涉及 `web/` 下的 React / TSX / 状态 / 加载体验 / 渲染性能时，必须同时使用 `ruoshui-react-vercel`。
- 涉及 `PlayCanvas/SOG` viewer runtime、相机、点位投影、小地图、空间交互、3D 性能调优时，必须同时使用 `ruoshui-web-3d`，并优先联动内置 `3d-graphics`、`3d-web-experience`。
- 涉及 `SuperSplat`、gaussian 资产清理、裁切/删除、`.ssproj`、`.ply/.splat/.sog` 导入导出与交付格式判断时，必须同时使用 `ruoshui-supersplat`。
- 涉及 `services/forum-api/`、`packages/shared/`、Node 侧脚本、服务层架构、错误处理或环境配置时，必须同时使用 `ruoshui-node-mcollina`。
- 涉及 `services/forum-api/src/worker.ts`、`services/forum-api/wrangler.toml`、`services/forum-api/migrations/`、`D1`、`R2`、`Workers bindings` 或部署时，必须同时使用 `ruoshui-cloudflare-workers`。
- 如果一次改动横跨前端、Node、Cloudflare 多个域，要叠加对应专业 skill，而不是只选一个。
- 如果当前任务命中了专业域，但现有 skill 没覆盖到关键问题，必须先补充或更新对应 skill，再继续实现。
- 优先顺序是：先看当前 session 已有 skill；若没有，再补仓库内 wrapper；若 wrapper 仍不够，再根据上游来源或官方文档更新 wrapper。
- 具体映射规则见 `docs/project/development-skills.md`。
- Keep iterations small and commit after each coherent step.
- 小步快跑，尽量把每次改动收口成一个清晰目的的小迭代，并勤快提交。
- 避免把过多不相关 changes 杂糅在一起；除非用户明确要求，否则不要把前端、后端、资产、基础设施的大改混成一个超大变更。
- 避免单次 changes 过大；如果任务天然偏大，优先先拆步骤、先落一块、先提交一块。
- Update the relevant docs when a project decision or experiment assumption changes.
- 如果为了本地验证临时拉起 `vite dev` / `vite preview`，结束后要主动清理对应进程，避免连续占用新端口。
- 在 `web/` 的 `TS/JS` 模块里，优先使用“文件末尾统一导出”的风格；不要在每个声明前单独写 `export`，改为在文件底部集中写 `export { ... }`。
