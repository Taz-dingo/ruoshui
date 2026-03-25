# Iteration 003 Octree-GS LOD Tuning

## 目标

验证 `Octree-GS` 的 `LOD` 是否只能停留在“当前 baseline 只有两档且最低层塌结构”的状态，还是可以通过少量参数调整拉出更可用的层级。

## 测试策略

这一步不继续做 40k 大扫，而是只做一条最小短跑变体：

- 基于现有 undistorted staging
- 只调整与 `LOD` 更相关的参数
- 将训练轮数缩短到 `10000`，先看层级是否发生结构性变化

本次参数为：

- `base_layer=-1`
- `levels=5`
- `init_level=1`
- `visible_threshold=-1`
- `iterations=10000`

训练入口：

- `scripts/run_octreegs_train.sh`

输出目录：

- `experiments/octreegs-src-20260325/Octree-GS-main/outputs/ruoshui/iteration001/lod-base-adaptive/2026-03-25_20:46:10`

## 初始化结果

与原 baseline 相比，这条变体在初始化阶段就出现了明显变化：

- 原 baseline：
  - `Base Layer of Tree: 12`
  - `Visible Threshold: 0.9`
  - `LOD Levels: 4`
  - `Initial Levels: 2`
  - `Initial Voxel Number: 80753`
- 本次变体：
  - `Base Layer of Tree: 11`
  - `Visible Threshold: 0.41579413414001465`
  - `LOD Levels: 5`
  - `Initial Levels: 1`
  - `Initial Voxel Number: 103036`

这说明：

- 参数调整没有被训练流程吃掉
- 它真实改变了 octree 初始化形态

## 10k 短跑结果

训练在约 `5` 分 `29` 秒完成，自动评估结果为：

- `PSNR 16.9192`
- `SSIM 0.3782`
- `LPIPS 0.6257`
- 测试渲染 `FPS 274.61813`

需要注意：

- 这条短跑不是为了争取最终质量最好
- 它的作用是回答：层级结构能不能被拉开

## LOD 补渲染结果

对该模型额外运行：

- `render.py --show_level --skip_train`

最终加载日志显示，当前不再只剩两档有效层级，而是变成：

- `Level 0: 40387, Ratio: 0.12390056540159466`
- `Level 1: 141452, Ratio: 0.4339510926086703`
- `Level 2: 144124, Ratio: 0.442148341989735`

这意味着：

- 这次模型最终确实形成了 `3` 档有效层级
- 原来“只能看到两档”的情况不是算法硬上限，而是上一组参数下的结果

## 主观观察

抽查代表视角后的判断是：

- `LOD0` 仍然太粗
  - 楼体边界发散
  - 亮色拖影明显
  - 难作为稳定粗预览层单独使用
- `LOD1` 已经明显比上一轮 baseline 的最低可用层更稳
  - 主建筑、道路、操场等结构大体可辨
  - 虽然仍偏糊，但不再像 `LOD0` 那样直接塌掉
- `LOD2` 与 `Full` 已经非常接近

更准确地说，这次层级关系更像：

- `LOD0`：极粗，不够稳定
- `LOD1`：可用的粗预览候选
- `LOD2`：接近完整结果

## 当前判断

这一步回答了一个重要问题：

- `Octree-GS` 的 `LOD` 不是只能停在“两档且最低层无用”
- 通过少量参数调整，层级确实可以被拉开

但这还不等于它已经成为最终主线，因为：

- `LOD0` 仍然偏差太大
- `LOD1` 虽然可用性上升，但还没有被验证成真正的浏览器端粗加载资产
- 当前仍然没有一条可直接接进现有 `GaussianSplats3D` 原型链的资产转换方式

因此当前最合理的结论是：

- `Octree-GS` 的 `LOD` 值得保留为“有明确正信号”的备选方向
- 它不该再被简单判成“LOD 没价值”
- 但也还没有强到足以立刻抢回默认主线

## 下一步建议

如果要再给 `Octree-GS` 一次小预算机会，当前最合理的方向不是继续刷默认 baseline，而是：

1. 继续围绕 `LOD` 参数做极小范围验证，而不是泛调画质参数。
2. 优先比较：
   - `base_layer`
   - `levels`
   - `init_level`
   - `visible_threshold`
3. 判断目标也应明确改为：
   - 最低可用层是否足够稳定
   - 是否能形成“粗预览 -> 主加载”的两阶段意义

如果不再继续投它，这一步至少已经证明：

- `Octree-GS` 的 `LOD` 价值是可调出来的
- 上一轮 baseline 对它的 `LOD` 结论不能被理解成“这条路线天生只有两档”
