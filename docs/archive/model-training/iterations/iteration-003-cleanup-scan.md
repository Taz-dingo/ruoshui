# Iteration 003 Cleanup Scan

## 目标

把 `Iteration 002` 中“底部大尺度离群高斯明显”这件事，从一次性观察推进成可重复的定向清理实验。

## 输入

- `outputs/iteration-002/export-rgb/splat.ply`
- `outputs/iteration-002/analysis/export-rgb-summary.json`
- `outputs/iteration-002/crop-zmin-p005/summary.json`
- `scripts/gaussian_ply_tools.py`

## 本次动作

1. 为 `scripts/gaussian_ply_tools.py` 补充 `max_scale` 分布汇总
2. 新增 `filter-cleanup` 子命令，支持按 `z_min` 与 `max_scale_max` 联合过滤
3. 新增 `sweep-cleanup` 子命令，支持批量扫描 `z` 下界分位数与 `max_scale` 上界分位数组合
4. 对当前 `export-rgb/splat.ply` 扫描 `20` 组候选组合
5. 物化两版代表候选：
   - `outputs/iteration-003/cleanup-scan/zp0.2-sp99.95/splat.ply`
   - `outputs/iteration-003/cleanup-scan/zp0.5-sp99.95/splat.ply`

## 关键发现

### 1. 极端大尺度高斯几乎完全落在低 `z` 尾部

扫描结果显示：

- 当取 `z < p0.5` 的尾部时，`max_scale > p99.99` 的点有 `476` 个，而且 `100%` 落在这个低 `z` 尾部
- 当取 `z < p0.2` 的尾部时，`max_scale > p99.95` 的点有 `2377` 个，其中约 `92.8%` 也落在低 `z` 尾部

这说明当前脏区并不只是“位置太低”，而是“低 `z` 区域里混着极端大尺度代理”。因此这轮清理更适合做联合过滤，而不是只切一个 `z_min`。

### 2. 极少量删除就能显著收缩 bbox

代表候选一：`zp0.2-sp99.95`

- 删除 `9677` 个高斯，占总量约 `0.204%`
- `bbox z extent` 从原始约 `55.33` 收到约 `4.56`
- `bbox x extent` 从约 `77.32` 收到约 `12.62`
- `bbox y extent` 从约 `98.07` 收到约 `9.74`

代表候选二：`zp0.5-sp99.95`

- 删除 `23781` 个高斯，占总量约 `0.500%`
- `bbox z extent` 收到约 `1.73`
- `bbox x extent` 收到约 `5.64`
- `bbox y extent` 收到约 `3.90`

这表明当前被极少数异常高斯拖大的空间范围，确实可以被非常小比例的定向过滤收回。

### 3. 这条路对字节体积帮助很有限

虽然空间范围大幅收缩，但当前文件体积变化很小：

- 原始 `export-rgb/splat.ply`：约 `268 MiB`
- `zp0.2-sp99.95`：约 `267 MiB`
- `zp0.5-sp99.95`：约 `267 MiB`

因此当前结论是：

- 这条路值得保留，因为它可能明显改善 viewer 中的脏区观感和默认 framing
- 但它不是当前 `Web MVP` 减重的主解

## 当前判断

这次实验已经证明：

- “底部脏区”可以被收敛成一个明确、可重复的联合过滤问题
- 当前最合理的清理前置步骤，不是只做单轴 `z` 裁切，而是优先考虑 `z + max_scale` 联合过滤

但这次实验也同时证明：

- 单靠导出后清理，无法把 `267 MiB` 量级直接推到 `Web MVP` 可接受区间
- 因此它应被视为“默认清理基线候选”，而不是代替后续 `mask / 素材重组 / 小规模复训`

## 当前推荐

若只选一个最平衡的下一轮默认候选，当前更推荐先看：

- `outputs/iteration-003/cleanup-scan/zp0.2-sp99.95/splat.ply`

原因：

- 它删除比例只有约 `0.204%`
- 已经能把 bbox 从异常大范围明显收回
- 比 `zp0.5-sp99.95` 更保守，更适合作为第一版联合清理基线

## 下一步

1. 用 viewer 对 `zp0.2-sp99.95` 做一次主观复看，确认主体未被误伤
2. 如果主观观感成立，把这条联合过滤记为默认清理前置步骤
3. 主线继续推进 `per-image campus mask` 或小规模复训设计，不把导出后清理误当成减重主解
