# 训练阶段归档与业务上下文收口设计

## 背景

若水广场已经结束模型训练与算法路线筛选，当前主线是 `Web` viewer、社区内容、Cloudflare 服务和业务体验开发。现有活跃文档仍把 Iteration 001–003 的训练过程、环境排障和算法实验放在默认入口中，`state.md` 与 `tasks.md` 也保留了大量历史流水，导致恢复项目时加载无关上下文。

## 目标

- 默认文档入口只描述当前业务开发阶段。
- 历史训练结论仍可追溯，但不再进入日常恢复上下文。
- 删除已经退役的训练、资产分析和实验入口，避免误用。
- 保留当前 Web、部署、业务开发、原始资产和既有输出产物。

## 文档信息架构

### 活跃区

活跃入口继续使用以下路径：

- `README.md`
- `docs/README.md`
- `docs/project/spec.md`
- `docs/project/plan.md`
- `docs/project/state.md`
- `docs/project/tasks.md`
- `docs/project/engineering-memory.md`
- `docs/project/cloudflare-community-plan.md`
- `docs/project/development-skills.md`
- `docs/project/mobile-safari-viewport-handoff.md`
- `docs/project/web-style-system.md`
- `docs/iterations/iteration-004-web-mvp.md`
- `docs/assets/raw-asset-policy.md`
- `docs/references/awesome-design.md`

`README.md`、`docs/README.md`、`plan.md`、`state.md` 和 `tasks.md` 将压缩为当前业务阶段的入口，不再重复训练流水。`spec.md` 保留稳定产品边界，只移除已经失效的“尚未验证模型可行性”措辞。

### 归档区

新增 `docs/archive/README.md` 和 `docs/archive/model-training/`。以下内容移动到归档区：

- `docs/assets/` 中除 `raw-asset-policy.md` 外的资产盘点、PoC 与训练可行性文档。
- Iteration 001、002、003 及其所有子记录。
- 已停止投入的 Iteration 005 progressive runtime 实验。
- 当前 `plan.md`、`state.md`、`tasks.md` 中仍有复用价值的训练阶段事实，通过归档文档保留；活跃文件只保留一段阶段结论和归档入口。

归档文档保持历史原文，不改写旧实验结论。移动后修复归档内部相互引用，并明确这些内容不属于当前执行计划。

## 删除范围

删除根目录下已经退役的可执行实验入口：

- `scripts/`：资产盘点、PoC 物化、COLMAP 兼容、PLY 清理、Scaffold-GS、Octree-GS、CityGaussian 相关脚本。
- `configs/`：CityGaussian 训练配置。
- `experiments/`：Iteration 002 GaussianSplats3D 试页。

以下内容明确保留：

- `web/scripts/` 中的构建、部署、benchmark 与格式工具。
- `services/`、`packages/`、`web/` 业务代码。
- `assets/raw/`、正式 SOG 资产、`data/` 和 `outputs/`。
- 当前本地未提交的社区与场景联动改动。

## Skill 与恢复流程

- `ruoshui-resume` 默认只读精简后的 active 文档，不再加载训练资产文档。
- `ruoshui-project` 的 source-of-truth 列表移除训练资产文档。
- `ruoshui-asset-poc` 改为历史/按需能力，引用归档路径，并明确相关生成脚本已删除，除非用户重新开启资产验证，否则不进入主线。
- `ruoshui-doc-sync` 与 `development-skills.md` 增加 active/archive 规则：当前决策写 active 文档，已结束实验移动到 archive。

## 验证标准

- `docs/README.md` 能清晰区分 active 与 archive。
- `state.md` 和 `tasks.md` 只描述当前业务开发状态与下一步。
- 仓库中不存在指向已删除根目录 `scripts/`、`configs/`、`experiments/` 的活跃说明。
- 所有归档文件可从 `docs/archive/README.md` 找到。
- Markdown 相对路径引用不存在明显断链。
- `git diff --check` 通过。
- `web` typecheck 与生产构建通过，证明删除根目录实验入口未影响业务构建。

## 非目标

- 不删除 `outputs/`、训练结果或原始素材。
- 不修改当前社区业务功能。
- 不重写历史实验结论。
- 不在本轮恢复模型训练链路。
