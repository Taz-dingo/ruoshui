# Iteration 003 Octree-GS Entry Check

## 目标

确认若水广场当前 `Iteration 001` 产物，是否已经足以作为 `Octree-GS` 的最小真实实验入口。

## 结论先行

当前结论是：

- `Octree-GS` 值得成为下一条真实实验路线
- 就数据入口而言，它与 `Scaffold-GS` 一样，基本可以直接复用若水广场现有 `COLMAP` 场景
- 它当前比继续在 `splatfacto` 上做小修小补更合理，因为它真正引入了新的 `LOD` 表示与多尺度渲染组织

更准确地说：

- 官方自定义数据入口同样是 `images + sparse/0`
- 若水广场当前 `outputs/iteration-001/processed` 已经具备 `images/` 与 `colmap/sparse/0`
- 因此当前主要问题不是“数据能不能接”，而是“是否值得进入一条更重但更符合项目目标的 `LOD` 路线”

## 官方入口要点

根据 `Octree-GS` 官方 README：

- 自定义数据需先通过 `COLMAP` 获得 `SfM points` 与 `camera poses`
- 官方目录结构为 `data/<dataset>/<scene>/images` 与 `data/<dataset>/<scene>/sparse/0`
- 单场景训练入口为 `bash single_train.sh`
- 训练完成后会自动输出渲染结果、`FPS` 和质量指标

这意味着：

- 若水广场现有 `COLMAP` 产物在目录形态上是兼容的
- 入口层面不需要重新定义数据表示
- 这条路线真正新增的复杂度在训练参数与 `LOD` 组织，不在数据 staging 本身

## 与若水广场当前产物的对齐结果

### 已具备的部分

- 图片目录已存在：`outputs/iteration-001/processed/images`
- `COLMAP sparse` 已存在：`outputs/iteration-001/processed/colmap/sparse/0`
- 图片数量与当前 `Iteration 001` 子集一致：`180`

### 需要补的一层

- `Octree-GS` 同样期待场景根目录下直接有 `images/` 与 `sparse/0`
- 我们当前的 `sparse/0` 仍在 `processed/colmap/sparse/0`
- 因此依旧建议沿用与 `Scaffold-GS` 相同的 staging 思路，而不是改写现有 `processed` 目录

## 与 `Scaffold-GS` 的差别

`Octree-GS` 值得做，不是因为它更容易接入，而是因为它回答的是另一个更贴近若水广场的问题：

- `Scaffold-GS` 更偏 anchor 驱动与 view-adaptive 表达
- `Octree-GS` 更偏 `LOD` 结构化表示、多尺度渲染与一致实时性能

对若水广场来说，后者和项目目标的对应关系更直接：

- 纪念场景是空中大场景
- 未来展示端是桌面 `Web`
- 我们最终需要面对多尺度浏览、层级细节和交付组织，而不是只看单次训练指标

因此在 `Scaffold-GS baseline` 已经证明默认参数不优于现有 `splatfacto` 后，`Octree-GS` 成为更合理的下一条结构化路线。

## 当前风险

### 风险 1：训练参数复杂度高于 `Scaffold-GS`

官方 `single_train.sh` 里除了常规参数，还需要同时理解：

- `fork`
- `base_layer`
- `visible_threshold`
- `dist2level`
- `update_ratio`
- `progressive`
- `levels`
- `init_level`
- `extra_ratio`
- `extra_up`

这意味着：

- 它不是“先跑一个完全不用理解的黑箱 baseline”
- 下一步需要先把官方单场景默认参数抄清楚，再决定若水广场的最小 baseline 怎么定

### 风险 2：官方测试环境较旧

README 标注的已验证环境是：

- `Ubuntu 18.04`
- `CUDA 11.6`
- `gcc 9.4.0`

而当前若水广场机器实际环境更偏：

- `CUDA 12.8`
- 新版驱动与工具链

这意味着：

- 即使数据入口无障碍，也很可能会遇到环境兼容和扩展编译问题
- 但这类问题的性质更像工程适配，而不是路线本身不成立

### 风险 3：真实收益仍需实跑验证

当前我们对 `Octree-GS` 的判断，仍然主要来自：

- 官方 README
- 它与若水广场目标的结构契合度
- 以及 `Scaffold-GS baseline` 已经失去默认主线资格这一前置事实

这还不等于它已经证明会优于 `splatfacto`。

## 当前判断

如果现在要选“下一条最值得真的动手的不同路线”，当前建议改为：

1. `Octree-GS`
2. `CityGaussian`
3. `2DGS / Mip-Splatting`

其中 `Octree-GS` 当前最适合作为下一条真实实验，因为：

- 数据入口能直接复用现有 `COLMAP` 场景
- 它提供了 `LOD` 和多尺度结构化表示，这是若水广场真正缺的能力
- 它比 `CityGaussian` 更轻，更适合作为下一步验证
- 它与 `Scaffold-GS` 相比，虽然更复杂，但方向上更贴近“桌面 Web 大场景浏览”

## 下一步建议

1. 先补一份 `Octree-GS` 单场景训练参数核查
2. 明确若水广场的最小 staging 是否可直接复用 `Scaffold-GS` 那套目录映射
3. 如果参数入口没有额外阻塞，再决定是否开始源码下载与环境落地

## 参考来源

- `Octree-GS` README：<https://github.com/city-super/Octree-GS>
- `Octree-GS` 项目页：<https://city-super.github.io/octree-gs/>

## 备注

这里的“值得成为下一条真实实验”是工程优先级判断，不是质量结论。它当前只是比继续在 `splatfacto` 上做小修小补更有信息增量。
