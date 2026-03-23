# Iteration 002

## 目标

把项目主线从“素材可行性验证”切到“场景可交付性验证”，为后续 `Web MVP` 准备一份可执行的体积优化与加载策略调研计划。

## 当前状态

本轮开始时：

- `Iteration 001` 已经证明当前素材和训练链路可以得到主观上可接受的空中场景结果
- 当前最终 checkpoint 约 `3.2 GB`，训练目录约 `3.8 GB`
- 当前尚未得到 `Web` 可直接加载的资产体积基线
- 当前也尚未决定是否必须坚持现有 `3DGS` 导出路线

## 输入

- `docs/project/state.md`
- `docs/project/tasks.md`
- `docs/iterations/iteration-001-validation.md`
- 当前训练目录：`outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630`

## 本轮要产出的东西

- 一份明确的体积优化与交付调研计划
- 一组需要优先验证的交付路线候选
- 一套判断“是否足以进入 `Web MVP`”的标准

## 调研范围

本轮不把方案锁死在“当前 checkpoint 直接上 Web”。

需要并行考虑的路线至少包括：

- 当前 `3DGS` 路线下的裁切、剪枝、压缩和颜色表示简化
- 当前 `3DGS` 路线下的渐进式加载、双阶段加载或预览资产方案
- 更适合交付的高斯相关表示，例如不完全等同于当前训练输出的轻量化表达
- 必要时使用静态预览、视频预览与高斯场景组合的 `MVP` 方案

## 需要回答的核心问题

1. 当前场景导出后的真实可交付体积是多少，而不是训练 checkpoint 多大？
2. 体积下降到什么量级时，桌面端 `Web MVP` 才算可接受？
3. 单纯剪枝是否足够，还是必须结合裁切、压缩、分层加载或替代表示？
4. “渐进式加载”对本项目应通过什么产品方式实现？
5. 如果最终资产仍偏大，最小可行 `MVP` 应该如何降级但不失去纪念展示价值？

## 候选路线

### 路线 A：保留当前 `3DGS`，优先做交付减重

- 裁切校园核心区域
- 做高斯剪枝和导出压缩
- 简化颜色表示
- 评估是否可直接进入 `Web viewer`

### 路线 B：保留当前 `3DGS`，通过双阶段加载进入 `MVP`

- 首屏加载静态封面、视频预览或低配场景
- 后台延迟加载完整场景
- 先保证可访问和叙事，再逐步提升沉浸性

### 路线 C：切换到更适合交付的高斯相关表示

- 不限定为当前导出的 `3DGS` 资产
- 优先以体积、加载体验和桌面端可发布性为决策标准
- 若替代路线明显更适合交付，可接受放弃当前导出格式

## 本轮通过标准

满足以下条件即可认为本轮完成：

- 已形成一份下一阶段调研计划，不再停留在口头判断
- 已把候选路线从“只谈剪枝”扩展到“交付策略 + 表示形式”
- 已明确下一步首先要做的是交付体积基线实验，而不是继续证明素材可行性

## 最新基线实验

### 2026-03-23

- 训练目录体积约 `3.8 GB`
- 最终 checkpoint `step-000029999.ckpt` 实测约 `3.19 GiB`（`3421422445` bytes）
- 默认 `gaussian-splat` 导出：`outputs/iteration-002/export-default/splat.ply`，实测约 `1.10 GiB`（`1178550914` bytes）
- `rgb` 颜色模式导出：`outputs/iteration-002/export-rgb/splat.ply`，实测约 `267.39 MiB`（`280381158` bytes）
- `rgb + gzip -9` 传输压缩：`outputs/iteration-002/transfer/splat.rgb.ply.gz`，实测约 `206.61 MiB`（`216649537` bytes）
- `rgb + zstd -19` 传输压缩：`outputs/iteration-002/transfer/splat.rgb.ply.zst`，实测约 `201.41 MiB`（`211189125` bytes）
- 与默认导出相比，`rgb` 导出体积下降约 `76.21%`
- 与未压缩 `rgb` 导出相比，`gzip` 仅再下降约 `22.73%`，`zstd` 仅再下降约 `24.68%`
- 导出过程中共过滤 `66317` 个低 opacity 高斯，最终导出 `4752215 / 4818532` 个高斯
- `ns-export` 在当前 `torch 2.10` / `nerfstudio 1.1.5` 环境下，同样需要显式导出 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`

## 当前判断

- 当前场景已经有了首轮真实交付体积基线，后续不应再只用 checkpoint 大小代替交付判断
- 默认 `sh_coeffs` 导出约 `1.10 GiB`，对 `Web MVP` 明显过重
- 单纯把颜色表示切到 `rgb` 就能显著减重，但约 `267 MiB` 的单文件资产仍不适合作为首屏完整场景直接加载
- 对当前二进制 `PLY` 而言，传输压缩只能再拿回约 `23%-25%`，压完后仍在 `200 MiB` 量级，说明单靠 HTTP 压缩救不了当前资产
- “颜色表示简化”应保留在路线 A 中，同时需要继续结合裁切、压缩和双阶段加载来判断是否可交付
- 现阶段不建议把下一步定义为“直接从 `180` 张跳到 `1600+` 张全量训练”
- 原因不是全量训练一定无效，而是当前主要瓶颈已转向交付体积；同时 `180` 张阶段暴露的问题更像覆盖结构、边缘校外区域和视角混杂，而不只是样本数量不足
- 如果沿用当前 `exhaustive matching` 思路，图像对数量会从 `180` 张时的 `16110` 对上升到 `1600` 张时的 `1279200` 对，或 `1637` 张时的 `1339066` 对，处理成本约为当前的 `79x-83x`
- 更合理的扩量方式应是先做结构化扩容，例如 `300-600` 张的分组或连续段实验，再决定是否值得进入更大规模训练

## 最新 viewer 兼容性核查

### 2026-03-23

- 本地执行 `npx -y @playcanvas/splat-transform --help`，确认 `splat-transform v1.9.2` 的声明输入格式包含 `.ply / .compressed.ply / .sog`，输出格式包含 `.compressed.ply / .sog / .html`
- 本地执行 `npx -y @playcanvas/splat-transform -w outputs/iteration-002/export-rgb/splat.ply outputs/iteration-002/playcanvas/splat.compressed.ply`，实际结果为 `Unsupported data in file`
- 当前 `export-rgb/splat.ply` 的头部字段为 Nerfstudio 风格：`x/y/z`、`red/green/blue`、`opacity`、`scale_0..2`、`rot_0..3`
- 这说明 PlayCanvas 路线虽然在文档层面支持 `.ply`，但对当前 Nerfstudio 导出的 `PLY schema` 不能假设直接兼容
- 官方 `GaussianSplats3D` 文档明确声明 viewer 可直接加载 `.ply / .splat / .ksplat`，并建议将 `.ply` 转成 `.ksplat` 以获得更快加载和更好的内部数据布局
- 同一份官方文档也明确提醒：该仓库当前已不再活跃维护，并推荐关注 `Spark` 作为更活跃的替代路线
- 已新增最小试页：`experiments/iteration-002-gaussiansplats3d/index.html`
- 已本地验证该试页和 `../../outputs/iteration-002/export-rgb/splat.ply` 在同源静态服务下均可返回 `HTTP 200`

## 当前 viewer 判断

- 如果目标是尽快验证“当前 Nerfstudio 导出能不能进入 Web 原型”，短期更现实的候选是 `GaussianSplats3D` 一类的 `PLY / ksplat` 路线，而不是先押注 PlayCanvas 的 `compressed.ply / sog`
- 如果后续仍想走 PlayCanvas 路线，下一步不是继续压缩当前 `PLY`，而是先解决 schema 兼容问题，例如找到可靠的格式归一化或替代导出路径
- `mkkellogg` 路线的工程风险在于上游不活跃、CPU splat sort 和大场景性能限制；PlayCanvas 路线的工程风险在于当前输入格式并不直接兼容
- 因此当前最小可执行下一步，应优先做一个基于 `GaussianSplats3D` 的最小 viewer 原型，验证当前 `rgb PLY` 的真实加载与浏览表现
- 当前仓库已经具备这个最小原型的静态入口；接下来需要真实打开浏览器，记录首屏等待、内存占用和可操作性

## 本轮之后的最小下一步

- 基于 `GaussianSplats3D` 做一个最小 viewer 原型，验证当前 `rgb PLY` 的实际加载、首屏等待和可浏览性
- 为路线 A / B / C 分别补充验证方式、输入产物和失败条件
- 再决定是优先推进 `PLY -> ksplat` 转换，还是先做校园核心区域裁切 / 剪枝实验
