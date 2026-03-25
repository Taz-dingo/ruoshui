# Iteration 003 Octree-GS Baseline

## 目标

完成若水广场首轮 `Octree-GS` baseline 的真实训练、收尾渲染与指标汇总，判断它是否值得接管当前主线。

## 输入

- `docs/iterations/iteration-003-octreegs-entry.md`
- `docs/iterations/iteration-003-octreegs-parameter-check.md`
- `outputs/iteration-003/scaffoldgs-undistorted`
- `outputs/iteration-003/octreegs-stage-undistorted/ruoshui/iteration001`
- `scripts/prepare_octreegs_stage.sh`
- `scripts/run_octreegs_train.sh`

## 实验配置

- 数据入口：undistorted `images + sparse/0`
- 训练目录：`experiments/octreegs-src-20260325/Octree-GS-main`
- 输出目录：`experiments/octreegs-src-20260325/Octree-GS-main/outputs/ruoshui/iteration001/baseline/2026-03-25_01:20:00`
- 官方 baseline 参数：
  - `fork=2`
  - `base_layer=12`
  - `visible_threshold=0.9`
  - `progressive=True`
  - `iterations=40000`

## 训练结果

训练主循环已完整跑完，并成功保存 `iteration_10000 / 20000 / 30000 / 40000` 的点云快照。

关键日志如下：

- 输入相机数：`179`
- `LOD Levels`：`4`
- `Initial Levels`：`2`
- `Initial Voxel Number`：`80753`
- `Min Voxel Size`：`0.0026273378171026707`
- `Max Voxel Size`：`0.021018702536821365`
- 训练末次测试日志：`[ITER 40000] Evaluating test: L1 0.11257694272891335 PSNR 16.243949599888012`
- 训练末次训练日志：`[ITER 40000] Evaluating train: L1 0.04504224956035614 PSNR 23.99894142150879`
- 主循环完成时间：约 `26` 分 `19` 秒

## 收尾阶段补记

训练结束后，官方自动渲染阶段在当前环境里没有卡在训练，而是卡在一个 `numpy` 兼容问题：

- `scene/gaussian_model.py` 仍使用 `np.int`
- 当前 `numpy` 版本已移除该别名

已做最小修补：

- 将 `np.int` 改为内建 `int`

之后已单独补跑：

- `python render.py -m outputs/ruoshui/iteration001/baseline/2026-03-25_01:20:00 --iteration 40000 --skip_train`
- `python metrics.py -m outputs/ruoshui/iteration001/baseline/2026-03-25_01:20:00`

## 最终指标

来自 `results.json` 的最终测试指标为：

- `PSNR 16.2087`
- `SSIM 0.3091`
- `LPIPS 0.5587`
- 平均可见高斯数 `GS 242675.2188`

自动渲染阶段补跑得到：

- 测试渲染 `FPS 251.80261`
- 测试集视角数：`23`

结果文件已落地：

- `results.json`
- `per_view.json`
- `test/ours_40000/renders`
- `test/ours_40000/gt`
- `point_cloud/iteration_40000/point_cloud.ply`

结果目录当前总大小约：

- `1.8G`

## 与现有基线对比

### 对比 `Iteration 001 splatfacto`

- `splatfacto`：`PSNR 20.25 / SSIM 0.599 / LPIPS 0.338`
- `Octree-GS baseline`：`PSNR 16.2087 / SSIM 0.3091 / LPIPS 0.5587`

结论：

- 当前首轮 `Octree-GS` baseline 在三项核心质量指标上都明显落后于现有 `splatfacto`
- 它还不能接管“当前最好质量基线”的位置

### 对比 `Scaffold-GS baseline`

- `Scaffold-GS`：`PSNR 16.2589 / SSIM 0.3200 / LPIPS 0.5592`
- `Octree-GS baseline`：`PSNR 16.2087 / SSIM 0.3091 / LPIPS 0.5587`

结论：

- 两者大体处于同一档
- `Octree-GS` 的 `LPIPS` 略好，但 `PSNR / SSIM` 略差
- 当前还不能说它在若水广场这个 `180` 张子集上已经优于 `Scaffold-GS`

## 当前判断

这轮实验给出的判断是：

- `Octree-GS` 的工程入口已经被真实打通
- 它确实能在若水广场现有 undistorted `COLMAP` 资产上跑完整训练
- 但官方默认 baseline 在当前子集上的质量并没有证明自己优于已有路线

因此当前更准确的定位应改为：

- `Octree-GS` 是一条已验证可跑通的结构化 `LOD` 备选路线
- 它暂时不能替代 `splatfacto` 作为质量基线
- 是否继续投入，应取决于后续主观复核和小范围参数扫是否能显著改善质量

## 2026-03-25 主观复核补记

已对以下材料做并排抽查：

- `outputs/iteration-003/octreegs-review/scaffold_vs_octree_sheet.png`
- `outputs/iteration-003/octreegs-review/splatfacto_eval_sheet.png`

其中需要明确：

- `Scaffold-GS` 与 `Octree-GS` 的对照来自同一套测试视角，可直接逐张对比
- `splatfacto` 的 `eval` 是另一套抽样视角，因此这里只能做“整体质量风格”对照，而不是逐帧一一对应

当前主观结论是：

- `Octree-GS` 没有出现“指标落后，但主观上更适合桌面 `Web` 漫游”的隐藏优势
- 它与 `Scaffold-GS` 整体处于同一档：建筑边界偏软，树冠容易糊成团，斜视角仍有明显白色拉花和结构错位
- 在抽查视角 `00005` 一类的倾斜远景里，`Octree-GS` 仍然存在比较重的亮色拖影和不稳定区域
- 在操场、网球场和屋顶这类高对比结构上，`Octree-GS` 也没有表现出比 `Scaffold-GS` 更扎实的线条保持
- 与之相比，`splatfacto` 虽然仍有失败视角，但好的视角里道路、楼体轮廓、球场边界和阴影关系明显更清楚

因此这一步的判断可以进一步收紧为：

- `Octree-GS` 当前不仅在指标上没有赢
- 在主观复核里也没有证明自己比 `Scaffold-GS` 或现有 `splatfacto` 更适合若水广场当前目标
- 短期内不值得继续围绕官方默认参数做连续深挖

## 下一步建议

1. 将 `Octree-GS` 明确降为“已验证可跑通，但当前不继续深挖”的备选路线。
2. 主线不要再停在 `Octree-GS` 官方默认参数小调，应直接转向下一条更有信息增量的结构化路线。
3. 若后续回头重看 `Octree-GS`，也应只在有明确假设时做一轮很小的参数扫，例如优先怀疑 `base_layer`，而不是盲目连续重跑。
