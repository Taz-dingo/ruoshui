# Iteration 003 Access Check

## 目标

回答当前最关键的两个接入问题：

1. `LightGaussian` 能否在不推翻现有链路的情况下接到当前结果后面
2. `CityGaussian / Octree-GS / Scaffold-GS` 中，哪条对自定义 `COLMAP` 场景的接入门槛最低

## 结论先行

### 结论 1

`LightGaussian` 值得优先看，而且很可能可以作为“现有结果后的压缩交付链路”来评估，但它更接近基于官方 `3D-GS` 的 checkpoint / `ply` 压缩流程，不能直接假设与当前 `nerfstudio + splatfacto` 输出完全兼容。

这意味着：

- 它是当前最值得优先核查的压缩路线
- 但第一步不是直接上手跑，而是先确认当前 checkpoint 或导出高斯能否映射到它期望的输入格式

### 结论 2

在大场景结构化路线里，当前接入门槛最低的候选更像是 `Scaffold-GS` 与 `Octree-GS`；`CityGaussian` 更强，但接入与流程复杂度也更高。

这意味着：

- 如果目标是尽快验证“自定义 `COLMAP` 校园场景能否切到结构化 `GS`”，先看 `Scaffold-GS`
- 如果目标是尽快验证“多层级 / `LOD` / 大场景渲染组织”是否有效，紧接着看 `Octree-GS`
- `CityGaussian` 仍然是高价值主线，但更适合在我们确认需要分块训练和 `LoD` 总流程时再投入

## 核查记录

### A. `LightGaussian`

依据：

- 官方仓库说明其代码基于 `gaussian-splatting`
- 官方 README 明确写到：用户可以直接 prune 一个已经训练好的 `3D-GS checkpoint`
- 官方 README 同时给出 prune、distill、quantize 三步压缩流程

当前判断：

- 它确实不是“必须从头训练”的路线，而是可以接在已有 `3D-GS` 结果后面
- 但这里的“已有结果”更接近 Graphdeco 官方 `3D-GS` 生态，而不是自动等同于 `nerfstudio splatfacto`
- 因此它和若水广场当前结果之间，最大的真实问题不是“值不值得看”，而是“输入格式能不能对上”

对若水广场的实际意义：

- 如果能接上，它是当前最务实的交付减重路线
- 如果不能直接接上，也仍值得评估是否存在 checkpoint / `ply` 归一化中间层

最小下一步：

- 明确 `LightGaussian` 期望的模型目录、checkpoint 结构与 `ply` 字段
- 对照当前 `outputs/iteration-001` 与 `outputs/iteration-002/export-rgb/splat.ply`，判断差异点

### B. `Scaffold-GS`

依据：

- 官方 README 明确给出自定义数据结构：`data/<dataset>/<scene>/images + sparse/0`
- 官方 README 明确写到：自定义数据应先用 `COLMAP` 处理，得到 `SfM points` 与 `camera poses`

当前判断：

- 它对若水广场当前数据形态最友好，因为我们已经有 `COLMAP` 结果和图像
- 它比 `CityGaussian` 少一层分块与合并流程，更适合作为第一个结构化 `GS` 试入口
- 风险主要在训练配置、显存占用和参数理解，不在数据接入本身

最小下一步：

- 核查它对单场景自定义数据的训练脚本、关键超参数和最小可跑配置

### C. `Octree-GS`

依据：

- 官方 README 同样要求自定义数据通过 `COLMAP` 处理，目录结构也是 `images + sparse/0`
- 官方 README 给出单场景训练入口 `single_train.sh`
- 官方文档明确它围绕 `LOD`、分层、渐进学习和大场景渲染组织展开

当前判断：

- 它的接入门槛与 `Scaffold-GS` 接近，因为数据入口一致
- 但训练与调参复杂度高于 `Scaffold-GS`，因为要同时理解 `LOD` 相关参数
- 对若水广场的价值非常直接，因为它和“桌面 Web 多尺度浏览”强相关

最小下一步：

- 核查 `single_train.sh` 需要补哪些路径和关键参数
- 判断现有校园场景是否已经值得直接进入 `LOD` 路线

### D. `CityGaussian`

依据：

- 官方文档给出期望目录结构：`data/your_scene/images + sparse/0`
- 官方流程包含 coarse model、partition、parallel finetune、merge、compression 等多个阶段
- 官方文档强调模型分块、数据分配、并行训练与 `LoD`

当前判断：

- 它不是“不能接入自定义 `COLMAP` 数据”，而是“接入后流程更重”
- 这条路线最适合后续确认需要 `300-600` 张级别结构化扩容、甚至继续向上扩量时使用
- 对当前若水广场来说，它很强，但不一定是第一个该落地的最小实验

最小下一步：

- 如果后续确认要走分块训练，再深入核查其单机最小可跑路径

## 当前排序

如果按“尽快得到对若水广场有价值的最小实验入口”排序：

1. `LightGaussian`
2. `Scaffold-GS`
3. `Octree-GS`
4. `CityGaussian`

说明：

- `LightGaussian` 排第一，是因为它最可能在不重训的前提下直接回应交付体积问题
- `Scaffold-GS` 排第二，是因为它最像“最容易接上现有 `COLMAP` 数据的结构化 `GS`”
- `Octree-GS` 紧随其后，因为它对 `LOD` 与大场景渲染非常相关，但参数复杂度略高
- `CityGaussian` 价值很高，但更适合在确定要进入更重的大场景训练流程后投入

## 下一步建议

1. 先做 `LightGaussian` 输入格式核查
2. 再做 `Scaffold-GS` 最小训练入口核查
3. 如果 `Scaffold-GS` 入口可控，再判断是否还需要并行核查 `Octree-GS`

## 参考来源

- `LightGaussian` README：<https://github.com/VITA-Group/LightGaussian>
- `Scaffold-GS` README：<https://github.com/city-super/Scaffold-GS>
- `Octree-GS` README：<https://github.com/city-super/Octree-GS>
- `CityGaussian` Data Preparation：<https://github.com/Linketic/CityGaussian/blob/main/doc/data_preparation.md>
- `CityGaussian` Run & Eval：<https://github.com/Linketic/CityGaussian/blob/main/doc/run%26eval.md>

## 备注

上面的“接入门槛最低”是基于官方文档所展示的数据入口与流程复杂度做出的工程判断，不是论文质量结论。
