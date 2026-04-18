# 开发专业 Skill 规范

最后更新：`2026-04-18`

## 目标

若水广场后续不再只依赖通用 coding 能力。开发时要按改动域显式启用对应的专业 skill，让实现风格、性能判断和运行时边界更稳定。

## 技能映射

### React / 前端体验

适用范围：

- `web/src/**/*.tsx`
- `web/src/**/*.ts`
- `web/vite.config.*`
- 组件拆分、状态管理、加载体验、渲染性能、交互反馈、首屏与 bundle 相关调整

必须使用：

- `ruoshui-react-vercel`

建议同时使用：

- `react-expert`
- `frontend-developer-skill`
- `writing-typescript`

来源收口：

- `Vercel Engineering` 的 React best-practice agent guide

### Web3D / Viewer Runtime

适用范围：

- `web/src/runtime/**`
- `web/src/components/viewer/**`
- `web/src/app/viewer*`
- `web/src/ui/**`
- `PlayCanvas / SOG / viewer runtime / 相机 / 空间投影 / 小地图 / 点位 / 路线预览 / 3D 性能` 相关调整

必须使用：

- `ruoshui-web-3d`

建议同时使用：

- `3d-graphics`
- `3d-web-experience`
- `ruoshui-react-vercel`，如果同时改动 React 面板与 UI 状态

来源收口：

- 内置 `3d-graphics`
- 内置 `3d-web-experience`
- 若水当前 `PlayCanvas/SOG` viewer 约束

### SuperSplat / Gaussian 资产编辑

适用范围：

- `SuperSplat` 编辑流程
- gaussian 资产清理、裁切、选择/删除
- `.ssproj`
- `.ply` / `.splat` / `.sog`
- 导入导出与发布前交付格式判断

必须使用：

- `ruoshui-supersplat`

建议同时使用：

- `ruoshui-web-3d`，如果资产决策会直接影响 viewer/runtime
- `ruoshui-asset-poc`，如果任务仍属于资产验证或 PoC 判断

来源收口：

- `PlayCanvas / SuperSplat` 官方产品页、仓库与用户手册

### Node / 后端通用实现

适用范围：

- `services/forum-api/src/index.ts`
- `services/forum-api/src/app.ts`
- `services/forum-api/src/routes/**`
- `services/forum-api/src/lib/**`
- `packages/shared/**`
- Node 侧脚本与本地 fallback 服务

必须使用：

- `ruoshui-node-mcollina`

建议同时使用：

- `writing-typescript`

来源收口：

- `Matteo Collina` 的 Node 技能库与 Node 官方最佳实践

### Cloudflare 服务

适用范围：

- `services/forum-api/src/worker.ts`
- `services/forum-api/src/db/d1/**`
- `services/forum-api/migrations/**`
- `services/forum-api/wrangler.toml`
- `D1 / R2 / Workers / bindings / deployment` 相关调整

必须使用：

- `ruoshui-cloudflare-workers`

建议同时使用：

- `ruoshui-node-mcollina`

来源收口：

- `Cloudflare` 官方 `Workers / D1 / R2` 文档

## 组合规则

1. 只改前端：至少带 `ruoshui-react-vercel`
2. 只改 Web3D viewer/runtime：至少带 `ruoshui-web-3d`
3. 只改 SuperSplat/gaussian 资产编辑链：至少带 `ruoshui-supersplat`
4. 只改 Node 后端：至少带 `ruoshui-node-mcollina`
5. 只改 Cloudflare 运行时或基建：至少带 `ruoshui-cloudflare-workers`
6. 改社区功能且同时动前端与 Cloudflare API：
   - 带 `ruoshui-react-vercel`
   - 带 `ruoshui-cloudflare-workers`
   - 共享 contract 或服务层调整时再加 `ruoshui-node-mcollina`
7. 改 viewer 且同时动 React 面板：
   - 带 `ruoshui-web-3d`
   - 带 `ruoshui-react-vercel`
8. 改 SuperSplat 导出链且同时影响 viewer 交付判断：
   - 带 `ruoshui-supersplat`
   - 带 `ruoshui-web-3d`

## 执行要求

1. 新线程进入实现前，先判断本轮改动属于哪个域
2. 若命中上述域，必须按映射启用专业 skill，而不是只依赖 `ruoshui-project`
3. 如果一次改动跨多个域，允许同时启用多个专业 skill
4. 如果当前任务需要的专业能力在当前已装 skill 里不存在，或现有 wrapper 没覆盖关键问题，先更新 skill，再继续实现
5. skill 更新顺序：
   - 先检查当前 session 已有 skill 能否覆盖
   - 若不够，先更新仓库内 wrapper skill 的规则和 references
   - 若仍不够，再补充上游来源或新增稳定开发域 skill
6. 若出现新的稳定开发域，需要把 skill 与映射规则补进本文件和 `AGENTS.md`

## 工程记忆与自改进

项目把“值得复用的踩坑经验”分成两层沉淀，而不是只靠线程上下文：

1. `docs/project/engineering-memory.md`
   - 作为项目级长期记忆
   - 记录跨线程仍然值得复用的踩坑经验、默认流程修正、环境限制、验证误区
2. 对应域 skill
   - 当经验已经稳定影响某个专业域的默认做法时，同时更新对应 skill 或 reference
   - 例如 Cloudflare 部署坑要回流到 `ruoshui-cloudflare-workers`

满足以下任一条件时，应在同一轮迭代里补记忆：

- 排查时间明显偏长，后续重复踩到的概率高
- 问题会误导部署、验证或线上判断
- 结论改变了默认工具链、默认发布路径或默认验证方法
- 经验已经足够稳定，适合写成团队规则

推荐记录格式：

- 日期
- 场景
- 表象
- 根因
- 解决方式
- 后续默认规则 / 防再犯措施

执行约束：

1. 新坑先写进 `engineering-memory`
2. 若该坑属于稳定专业域，再同步更新对应 skill
3. `ruoshui-resume` 进入新线程时优先读取该记忆，避免重复排查
4. `ruoshui-cleanup` 在 commit 前检查本轮是否出现值得沉淀的新经验
