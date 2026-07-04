## Skills

### Available skills

- `ruoshui-resume`: 继续/恢复项目时用，快速找回当前业务开发上下文。
- `ruoshui-project`: 本仓库默认 skill，负责范围、节奏、交付规则。
- `ruoshui-doc-sync`: 文档更新、状态同步、归档、handoff 时用。
- `ruoshui-cleanup`: 每次 commit-sized 收口前的清理与最小验证。
- `ruoshui-asset-poc`: 只在历史素材、PoC、3DGS 可行性问题里用。
- `ruoshui-react-vercel`: `web/` 下 React / TSX / 状态 / 渲染性能必带。
- `ruoshui-web-3d`: viewer / SOG / 相机 / 点位 / 小地图 / 空间交互必带。
- `ruoshui-supersplat`: SuperSplat、gaussian 资产清理与导出判断必带。
- `ruoshui-node-mcollina`: `services/forum-api/`、`packages/shared/`、Node 服务层与脚本必带。
- `ruoshui-cloudflare-workers`: Workers / D1 / R2 / `wrangler.toml` / migrations / deploy 必带。

## Default Context Budget

正常任务按最小入口读取，不要把整个 docs 树当默认上下文：

1. `docs/project/state.md` 是唯一默认入口
2. 只有在需要确认下一步优先级时再读 `docs/project/tasks.md`
3. 只有在产品边界或路线不清楚时再读 `README.md`、`docs/project/spec.md`、`docs/project/plan.md`
4. 只有在 deploy / debug / 验证链路相关任务时再读 `docs/project/engineering-memory.md`
5. 只有在当前改动域需要时才读对应 `docs/project/**` focused docs
6. `docs/project/development-skills.md` 只在 skill 选型不明确或跨域较复杂时再打开
7. `docs/archive/**` 一律不进默认恢复；只有明确历史/训练任务才按需读取

## How to use skills

- 用户说“继续 / 接着做 / resume”或新线程缺上下文时，先用 `ruoshui-resume`
- 本 repo 的实现、规划、保存进度，默认带 `ruoshui-project`
- 文档归档、状态同步、handoff、`state/tasks/engineering-memory` 取舍时，带 `ruoshui-doc-sync`
- 每次 commit-sized 交付前都带 `ruoshui-cleanup`
- 命中前端 / Web3D / SuperSplat / Node / Cloudflare 域时，叠加对应专业 skill
- 如果已有 skill 覆盖不了关键问题，先更新 skill，再继续实现
- 具体映射规则见 `docs/project/development-skills.md`

## Delivery Rules

- 小步快跑，每次改动收口成一个清晰目的的小迭代
- 避免把不相关的前端、后端、资产、基础设施改动混成一个超大变更
- 新 feature 默认新建分支；一轮 coherent 改动后优先通过 PR 更新
- 提 PR 前做总体 review 和相关验证，检查跨文件影响、风险和明显回归
- 项目默认只维护 active docs；已结束方向移入 `docs/archive/`
- 本地临时拉起 `vite dev` / `vite preview` 后，结束时主动清理进程
- `web/` 的 `TS/JS` 模块优先使用“文件末尾统一导出”
