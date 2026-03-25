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

## 体积与 Web 链路补记

这一步需要把“质量”“体积”“Web 可用性”拆开看，不能只用一套指标替代三件事。

当前已确认的事实有两条：

### 1. 裸 `PLY` 体积并不更差

- `Octree-GS` 最终 `point_cloud/iteration_40000/point_cloud.ply`：约 `256 MiB`
- 现有 `splatfacto rgb ply`：约 `268 MiB`

因此如果只看“最终单个 `PLY` 文件大小”，`Octree-GS` 至少没有比当前 `splatfacto rgb` 更重。

### 2. 但它不能直接复用当前 Web 原型链

当前已实际核对 `PLY header`：

- `splatfacto rgb ply` 是当前 viewer 可直接尝试的高斯 schema：
  - `x y z`
  - `red green blue`
  - `opacity`
  - `scale_0/1/2`
  - `rot_0/1/2/3`
- `Octree-GS point_cloud.ply` 则不是这个形态，而是：
  - `x y z`
  - `level / extra_level / info`
  - `f_offset_*`
  - `f_anchor_feat_*`
  - `opacity`
  - `scale_0..5`
  - `rot_0..3`

同时它的最终模型目录还依赖：

- `color_mlp.pt`
- `opacity_mlp.pt`
- `cov_mlp.pt`

这意味着：

- `Octree-GS` 当前结果不是“一个单独的、现成可喂给现有 `GaussianSplats3D` 试页的 `PLY` 文件”
- 它的可视表示依赖额外的 learned MLP，而不是单文件内显式写出的 `rgb`
- 因此它在“是否能直接接进当前 Web 原型链”这个问题上，当前答案不是已验证可行，而是当前链路下不直接兼容

更准确地说：

- 它在“裸文件体积”上没有吃亏
- 但在“直接进入当前 Web viewer 链路”的便利性上，当前反而弱于现有 `splatfacto rgb ply`

## LOD 价值补测

考虑到 `Octree-GS` 的核心卖点不是单纯画质，而是 `LOD` 与多尺度组织，这一步额外补做了离线 `LOD` 渲染验证：

- 运行方式：`render.py --show_level --skip_train`
- 输出目录：`test/ours_40000/renders_level`
- 当前实际可见层级为两层：
  - `LOD0`
  - `LOD1`

同时 `per_view_count_level.json` 显示：

- 多数视角下，`LOD0` 的可见高斯数明显少于 `LOD1`
- 这说明它确实不是“只有一个假层级标签”，而是在做真实的层级裁剪

但主观结果同样需要分开看：

### 已验证的正面事实

- `LOD` 机制确实在工作
- `LOD0` 相比 `LOD1` / `Full`，高斯可见数显著下降
- 这证明 `Octree-GS` 在表示层面确实具备“粗到细”的组织能力

### 当前看到的限制

- 在多张代表视角里，`LOD0` 已经明显丢失主结构稳定性
- 典型现象包括：
  - 楼体轮廓破碎
  - 亮色拖影增多
  - 远景区域发白、发散
  - 树冠与建筑边界混成团
- `LOD1` 则基本接近 `Full`，说明当前更像“两档切换”：
  - 一档太粗，难直接单独作为稳定预览
  - 一档接近完整结果，减载空间有限

因此这一步更准确的判断是：

- `Octree-GS` 的 `LOD` 不是假的，技术上确实成立
- 但在若水广场当前这轮 baseline 上，最低层级还不足以单独承担一个“粗预览层”的角色
- 所以它还不能直接转化成“当前 Web 端已经拿到一个可用的分层加载优势”

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
- 它的最终 `PLY` 单文件体积并不更差，但现阶段不能直接复用当前 Web 原型链

因此当前更准确的定位应改为：

- `Octree-GS` 是一条已验证可跑通的结构化 `LOD` 备选路线
- 它暂时不能替代 `splatfacto` 作为质量基线
- 它也还没有证明自己能在当前项目里形成“更容易 Web 交付”的实际优势
- 是否继续投入，应取决于后续是否愿意专门为它补一条新的 Web 资产转换链，而不只是继续刷训练参数

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
- 在当前 Web 原型链下，它也不是比 `splatfacto rgb ply` 更直接可用的交付资产
- 短期内不值得继续围绕官方默认参数做连续深挖

## 下一步建议

1. 将 `Octree-GS` 明确降为“已验证可跑通，但当前不继续深挖”的备选路线。
2. 主线不要再停在 `Octree-GS` 官方默认参数小调，应直接转向下一条更有信息增量的结构化路线。
3. 若后续回头重看 `Octree-GS`，也应只在有明确假设时做一轮很小的参数扫，例如优先怀疑 `base_layer`，而不是盲目连续重跑。
