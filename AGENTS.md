## Skills
### Available skills
- ruoshui-resume: Recover project background, current status, open tasks, and next-step plan for 若水广场. Use when the user says “继续”, “接着做”, “resume”, or starts a new thread without full context. (file: ./.codex/skills/ruoshui-resume/SKILL.md)
- ruoshui-project: Preserve current project scope, iteration rhythm, and delivery rules for 若水广场. Use for planning, scoping, documentation, saving current progress, preparing handoffs, and general implementation in this repo. (file: ./.codex/skills/ruoshui-project/SKILL.md)
- ruoshui-cleanup: Run the repo’s pre-commit cleanup pass for 若水广场. Use before every commit-sized delivery to sync docs, remove stale or dirty info, clean obvious dead code, and run the smallest relevant validation. (file: ./.codex/skills/ruoshui-cleanup/SKILL.md)
- ruoshui-asset-poc: Handle raw asset inventory, duplicate-name rules, PoC subset selection, and 3DGS feasibility workflow. Use for any task touching `assets/raw`, `data/asset_inventory.json`, `data/poc-001-files.txt`, or related docs. (file: ./.codex/skills/ruoshui-asset-poc/SKILL.md)

## How to use skills
- Use `ruoshui-resume` first when the user says “继续”, “接着做”, or opens a fresh thread with little context.
- Use `ruoshui-project` by default for work in this repo unless the task is purely mechanical.
- Also use `ruoshui-project` when the user asks to save progress, record current status, or prepare a handoff.
- Use `ruoshui-cleanup` before every commit-sized delivery, even when the change looks doc-only or “just a small cleanup”.
- Also use `ruoshui-asset-poc` when the task involves image assets, PoC sampling, or first-pass 3DGS validation.
- Keep iterations small and commit after each coherent step.
- Update the relevant docs when a project decision or experiment assumption changes.
- 如果为了本地验证临时拉起 `vite dev` / `vite preview`，结束后要主动清理对应进程，避免连续占用新端口。
- 在 `web/` 的 `TS/JS` 模块里，优先使用“文件末尾统一导出”的风格；不要在每个声明前单独写 `export`，改为在文件底部集中写 `export { ... }`。
