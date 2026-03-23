# Iteration 002 GaussianSplats3D Viewer Check

这是一个隔离的最小试页，用来验证当前 `rgb PLY` 以及两版裁切候选，是否能作为 `GaussianSplats3D` 的直接输入进入浏览器原型。

## 目标

- 不启动正式前端项目
- 不先做内容层和页面层
- 只检查当前 `outputs/iteration-002/export-rgb/splat.ply` 的实际加载与浏览可行性

## 启动方式

在仓库根目录运行：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://127.0.0.1:8000/experiments/iteration-002-gaussiansplats3d/
```

## 当前试验设置

- Viewer：`@mkkellogg/gaussian-splats-3d@0.4.7`
- 输入资产：
  - `../../outputs/iteration-002/export-rgb/splat.ply`
  - `../../outputs/iteration-002/crop-zmin-p005/splat.ply`
  - `../../outputs/iteration-002/crop-p05-p995/splat.ply`
- 加载模式：`progressiveLoad = true`
- 当前默认组合：`boxcrop + 14x`
- 试页可切换 scale：`6x / 10x / 14x`
- 约束：当前仍然是原始 `PLY` 直读，不是 `ksplat`

## 观察项

- 首屏等待时长是否可接受
- 页面是否能稳定开始显示 splats
- 相机操作时是否出现明显卡顿
- 浏览器是否出现明显内存或标签页崩溃问题
- 不同 scale 下，是否仍需要长时间手动缩放才能进入舒服视角
- 哪个 scale 的交互手感最好
- 底部噪声高斯在 `z` 裁切后是否明显减少
- 三轴 box 裁切是否会误伤主体结构
- 当前 `267 MiB` 级别原始 `PLY` 是否已经超出这条路线的可承受范围

## 备注

- 这是 `Stage 1.5` 的交付验证实验，不代表最终页面结构
- 当前主观默认候选已收敛为：`boxcrop + 14x`
- 如果这一步都无法稳定加载，后续主线应优先转向 `PLY -> ksplat`、裁切、剪枝或双阶段加载
