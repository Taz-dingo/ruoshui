# Iteration 003 Algorithm Screening

## 目标

为若水广场当前阶段筛选最值得优先验证的 `GS` 算法路线，避免默认把当前 `nerfstudio + splatfacto` 当成唯一主线。

## 当前问题画像

当前已经明确的问题不是单一的“质量不够好”，而是三类问题叠加：

- 几何与边缘问题：`floaters`、边缘拉花、底部大尺度离群高斯
- 场景规模问题：校园空中场景比常见物体级和小房间级实验更接近大场景
- 交付问题：当前 `rgb PLY` 仍约 `267 MiB`，即使传输压缩后也仍约 `200 MiB`

因此路线筛选不能只问“谁更清晰”，还要同时问：

- 谁更可能减少无效高斯或改善结构稳定性
- 谁更适合大场景训练与渲染
- 谁更接近 `Web MVP` 的交付约束

## 候选路线

### 1. `2DGS` / 几何优先路线

代表：

- `2D Gaussian Splatting`
- `Mip-Splatting`

当前价值判断：

- `2DGS` 的核心优势是几何更准，适合处理表面结构、伪影和网格质量问题
- `Mip-Splatting` 更偏向抗锯齿与伪影抑制，适合减少多尺度观察下的 aliasing 和闪烁
- 这条路线更像“让结果更干净、更像表面”，但不是天然的“大场景交付减重方案”

对本项目的意义：

- 如果当前问题的主因是校园边缘、地面和建筑表面被 3D 高斯拉花污染，这条线值得认真看
- 如果当前更大的痛点是大场景规模、加载体积和分层交付，这条线应排在结构化大场景方案之后

当前结论：

- 需要纳入主评估池
- 但暂时不应作为第一优先级的唯一主线

### 2. 大场景结构化 `GS` 路线

代表：

- `Scaffold-GS`
- `Octree-GS`
- `CityGaussian`
- `VastGaussian`

当前价值判断：

- 这类方法直接面向大场景训练、结构化表示、`LOD`、分块或分层渲染
- 对若水广场这种校园级空中场景，这条线与“体积、范围、可交付性”更直接相关
- 如果后续确实要从 `180` 张扩到 `300-600` 张甚至更高，这类方法比继续裸跑单体 `splatfacto` 更值得优先评估

对本项目的意义：

- `Scaffold-GS` 更适合关注减少冗余高斯、提高视角自适应表现
- `Octree-GS` 更适合关注 `LOD`、层级结构与一致实时渲染
- `CityGaussian` / `VastGaussian` 更适合关注 divide-and-conquer、分块训练和更大范围场景

当前结论：

- 这是当前最该前置评估的主线
- 至少要先判断其中是否存在一条能同时回应“规模 + 质量 + 交付”的路线

### 3. 压缩与轻量化交付路线

代表：

- `LightGaussian`

当前价值判断：

- 这条线主要回答“当前高斯结果怎么变得更轻、更适合发布”
- 它不能替代训练侧的大场景优化，但非常贴近当前 `Web MVP` 的真实痛点
- 如果能与当前训练输出衔接，就比重新换整条训练栈更务实

对本项目的意义：

- 非常适合当作“交付表示”和“训练表示”解耦的候选
- 适合在当前已有可看结果的前提下继续压缩体积

当前结论：

- 应与大场景结构化路线并列为高优先级
- 不该等到复训之后才看

## 当前优先级

### 第一优先级

- 大场景结构化 `GS`
- 压缩与轻量化交付

原因：

- 这两条线最直接对应当前项目最痛的两个问题：校园级场景规模，以及 `Web` 交付体积

### 第二优先级

- `2DGS`
- `Mip-Splatting`

原因：

- 它们很可能改善几何稳定性和伪影，但不直接保证更轻、更适合大场景交付

## 建议下一步

1. 先完成一版纸面筛选表，比较 `2DGS / Mip-Splatting / Scaffold-GS / Octree-GS / CityGaussian / VastGaussian / LightGaussian`
2. 明确每条路线对若水广场最相关的能力、迁移成本和最小验证方式
3. 再决定第一个真实实验是：
   - 继续基于当前 `PLY` 做定向清理
   - 迁移到压缩交付路线
   - 或为下一轮复训切到结构化大场景 `GS`

## 参考入口

- `2DGS`：<https://github.com/hbb1/2d-gaussian-splatting>
- `Mip-Splatting`：<https://github.com/autonomousvision/mip-splatting>
- `Scaffold-GS`：<https://city-super.github.io/scaffold-gs/>
- `Octree-GS`：<https://github.com/city-super/Octree-GS>
- `CityGaussian`：<https://dekuliutesla.github.io/citygs/>
- `VastGaussian`：<https://vastgaussian.github.io/>
- `LightGaussian`：<https://lightgaussian.github.io/>
