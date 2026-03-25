# Iteration 003 CityGaussian Entry Check

## 目标

在 `Scaffold-GS` 与 `Octree-GS` 都已完成真实 baseline、且均未超过现有 `splatfacto` 之后，确认 `CityGaussian` 是否应成为若水广场下一条结构化 `GS` 主线。

## 结论先行

当前结论是：

- `CityGaussian` 值得成为下一条结构化主线候选
- 在用户已对 `Scaffold-GS`、`Octree-GS` 当前效果给出“不值得继续”的主观判断后，它现在应直接升为下一 session 的默认 baseline 入口
- 它不是 `Scaffold-GS` / `Octree-GS` 那种“最小单场景 baseline 很快就能起”的轻入口
- 但它更直接对应若水广场真正要面对的问题：大场景分块、并行训练、层级组织，以及后续 `300-600` 张级别的结构化扩容

更准确地说：

- 这条路线的价值在于“大场景训练组织能力”
- 它的代价在于：工程链路更重，前置准备比 `Scaffold-GS` / `Octree-GS` 都多

因此它现在适合作为：

- 下一条需要先做入口核查与最小 staging 设计的结构化路线

而不是：

- 立刻无前置判断地开始盲目装环境或长时间重训

## 官方入口要点

根据官方仓库说明与远端分支核查，当前需要先接受一个事实：`CityGaussian` 现在不是单一代码入口，而是至少有两条实际可选分支：

- 远端当前可见稳定分支至少包括 `main` 与 `V1-original`
- `main` 已对齐到较新的 `Gaussian Lightning v0.10.1` 体系
- 若要看原始 `V1` 流程，需要切到远端真实分支名 `V1-original`
- 自定义数据预处理的目标场景目录仍然围绕：
  - `data/your_scene/images`
  - `data/your_scene/sparse/0`
- 在当前主线文档表述里，自定义数据通常还要求：
  - 先按目标比例做图像下采样
  - 生成 `Depth Anything V2` 深度用于正则
- 正式运行链路不是单阶段训练，而是：
  1. coarse model
  2. model partition and data assignment
  3. parallel finetune and merge
  4. test / speed evaluation

这意味着：

- 若水广场现有 undistorted `COLMAP` 资产并没有被官方数据格式直接排斥
- 真正新增的复杂度，不在“能不能接入 `COLMAP`”，而在“是否愿意进入完整的大场景分块训练链”
- 在真正下载源码前，先把“分支选哪条”和“若水广场 staging 如何映射”写清楚，信息增量最高

## 对若水广场的意义

`CityGaussian` 当前比 `Scaffold-GS` / `Octree-GS` 更合理的地方，不在于它更轻，而在于它更贴近若水广场后续真正的扩量形态：

- 校园空中场景天然更接近大场景而不是小房间
- 现有 `180` 张子集已经说明“单体 baseline 是否能跑”这个问题基本问完了
- 下一步更值得问的是：
  - 分块训练能否改善大范围结构稳定性
  - 是否能为后续 `300-600` 张级别扩容打好组织方式
  - 是否能把 `LOD / block / merge` 这套思路前置验证

## 与当前产物的对齐判断

### 已具备的部分

- 已有 undistorted `images + sparse/0`
- 已有可复用的 `COLMAP` 结果
- 已有结构化 `GS` 连续尝试经验：`Scaffold-GS` 与 `Octree-GS`

### 还缺的关键前置

- 需要为 `CityGaussian` 明确主分支还是 `V1-original` 分支
- 需要确认若水广场是按“单场景 custom dataset”接入，还是需要提前定义 block / scene 命名
- 需要补一条最小数据预处理链：
  - 图像下采样
  - `Depth Anything V2` 深度生成
- 需要理解 coarse / partition / finetune / merge 的最小配置文件入口

## 本轮新增落地结果

这次恢复后，已经把若水广场侧最小 staging 入口先固定下来：

- 新增脚本：`scripts/prepare_citygaussian_stage.sh`
- 默认输入：`outputs/iteration-003/scaffoldgs-undistorted`
- 默认输出：`outputs/iteration-003/citygaussian-stage/ruoshui/iteration001`
- 当前脚本只负责把现有 undistorted `images + sparse/0` 映射成 `CityGaussian` 可复用的自定义场景根目录

这样做的意义是：

- 先复用已经验证可用的 undistorted `COLMAP` 资产
- 不污染现有 `processed`、`scaffoldgs`、`octreegs` staging
- 让下一步分支选择、下采样和深度生成都围绕一个稳定 scene root 继续

## 当前风险

### 风险 1：当前主分支已不是最早的 `CityGaussian V1`

官方与远端分支核查已经明确：

- 主分支已 rebased 到 `Gaussian Lightning v0.10.1`
- 原始 `V1` 需切到远端真实分支名 `V1-original`

这意味着：

- 如果我们只想验证原论文里的大场景 divide-and-conquer 路线，必须先确认应该跟哪一支代码
- 否则容易把“`CityGaussian` 值得试”混成“直接用最新主分支就一定最合适”

### 风险 2：它比 `Octree-GS` 多出深度与分块前置

这条路线的额外成本至少包括：

- 下采样策略
- `Depth Anything V2`
- block partition
- per-block tuning 与 merge

因此它不是下一个“一小时内起训练”的轻实验。

### 风险 3：当前 `180` 张子集可能还不足以触发它的主要优势

`CityGaussian` 的价值主要体现在：

- 大场景
- 分块
- 更强的训练组织能力

如果仍然只在当前 `180` 张子集上验证，它的优势可能被压缩得不够明显。

因此这条路线更适合与“结构化扩量到 `300-600` 张”一起思考，而不是只把它当成另一个 `180` 张 baseline 替代品。

## 当前判断

如果现在只回答“下一条结构化路线该是谁”，当前建议改为：

1. `CityGaussian`
2. `LightGaussian`
3. `2DGS / Mip-Splatting`

这里的意思不是 `LightGaussian` 比 `2DGS` 更重要，而是：

- 在 `Scaffold-GS` 与 `Octree-GS` 已完成真实判定后
- 若水广场下一条最有信息增量的路线，一个是更重的大场景训练组织路线 `CityGaussian`
- 另一个是直接回答交付体积问题的 `LightGaussian`

## 下一步建议

1. 下一 session 直接从 `CityGaussian` 分支选择与最小入口核查开始。
2. 直接复用 `scripts/prepare_citygaussian_stage.sh` 生成若水广场专用 scene root。
3. 在此基础上明确若水广场若沿这条路线推进，最小配置文件、下采样目录和深度生成链怎么映射。
4. 只有在这些入口条件清楚后，才决定是否真的开始源码下载与环境落地。

## 交接补记

截至当前这一轮，结构化路线的状态已经收敛为：

- `Scaffold-GS`：已跑通，当前不继续
- `Octree-GS`：baseline、Web/体积、`LOD` 调参都已补测，当前不继续
- `CityGaussian`：成为下一条默认 baseline 候选

因此如果在新 session 恢复工作，最合理的入口不再是回顾 `Octree-GS`，而是：

- 直接开始 `CityGaussian` 的最小分支 / 数据 / 配置核查

## 参考来源

- `CityGaussian` 官方仓库：<https://github.com/Linketic/CityGaussian>
- `README`：<https://github.com/Linketic/CityGaussian>
- `Data Preparation`：<https://github.com/Linketic/CityGaussian/blob/main/doc/data_preparation.md>
- `Run & Eval`：<https://github.com/Linketic/CityGaussian/blob/main/doc/run%26eval.md>
- 远端分支核查：`git ls-remote --heads https://github.com/Linketic/CityGaussian.git`

## 备注

这里的“下一条结构化主线候选”是优先级判断，不是质量结论。当前只说明：在 `Scaffold-GS` 与 `Octree-GS` 都已判负后，`CityGaussian` 是最值得继续核查的大场景路线。
