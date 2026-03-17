## Skills
### Available skills
- ruoshui-resume: Recover project background, current status, open tasks, and next-step plan for 若水广场. Use when the user says “继续”, “接着做”, “resume”, or starts a new thread without full context. (file: ./.codex/skills/ruoshui-resume/SKILL.md)
- ruoshui-project: Preserve current project scope, iteration rhythm, and delivery rules for 若水广场. Use for planning, scoping, documentation, and general implementation in this repo. (file: ./.codex/skills/ruoshui-project/SKILL.md)
- ruoshui-asset-poc: Handle raw asset inventory, duplicate-name rules, PoC subset selection, and 3DGS feasibility workflow. Use for any task touching `assets/raw`, `data/asset_inventory.json`, `data/poc-001-files.txt`, or related docs. (file: ./.codex/skills/ruoshui-asset-poc/SKILL.md)

## How to use skills
- Use `ruoshui-resume` first when the user says “继续”, “接着做”, or opens a fresh thread with little context.
- Use `ruoshui-project` by default for work in this repo unless the task is purely mechanical.
- Also use `ruoshui-asset-poc` when the task involves image assets, PoC sampling, or first-pass 3DGS validation.
- Keep iterations small and commit after each coherent step.
- Update the relevant docs when a project decision or experiment assumption changes.
