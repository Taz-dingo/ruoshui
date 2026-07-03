# Iteration 003 Scaffold-GS Entry Check

## 目标

确认若水广场当前 `Iteration 001` 产物，是否已经足以作为 `Scaffold-GS` 的第一条真实重训入口。

## 结论先行

结论是：可以进入最小重训准备阶段，而且当前数据缺口很小。

更准确地说：

- `Scaffold-GS` 官方自定义数据入口就是 `images + sparse/0`
- 若水广场当前 `outputs/iteration-001/processed` 已经具备 `images/` 和 `colmap/sparse/0/`
- 当前主要不是“数据不够”，而是“目录层级和训练脚本参数要对齐”

所以它适合作为当前第一条真实重训主线。

## 官方入口要点

根据 `Scaffold-GS` 官方 README 与训练脚本：

- 自定义数据需先经过 `COLMAP`
- 官方数据结构为 `data/<dataset>/<scene>/images` 与 `data/<dataset>/<scene>/sparse/0`
- 单场景训练入口为 `bash ./single_train.sh`
- `single_train.sh` 实际调用 `train.sh`
- `train.sh` 最终执行：

```bash
python train.py --eval -s data/${data} ... -m outputs/${data}/${logdir}/$time
```

这说明：

- `-s` 指向的是场景根目录
- 该根目录下应至少能找到 `images/` 与 `sparse/0/`
- 训练日志会自动写到 `outputs/<dataset>/<scene>/<exp_name>/<time>/`

## 与若水广场当前产物的对齐结果

### 已具备的部分

- 图片目录已存在：`outputs/iteration-001/processed/images`
- 图片数量已核对：`180`
- `COLMAP sparse` 已存在：`outputs/iteration-001/processed/colmap/sparse/0`
- `sparse/0` 中已有：
  - `cameras.bin`
  - `images.bin`
  - `points3D.bin`
  - `frames.bin`
  - `rigs.bin`
  - `project.ini`

### 不直接对齐的部分

- `Scaffold-GS` 默认期待的是场景根目录下直接有 `sparse/0`
- 我们当前的 `sparse/0` 在 `processed/colmap/sparse/0`
- 也就是说，当前差的不是核心数据，而是目录重排或一层 staging

### 当前不构成阻塞的部分

- `transforms.json` 不是 `Scaffold-GS` 自定义数据的主入口要求
- `images_2 / images_4 / images_8` 对最小训练入口不是必需项
- 当前没有 Graphdeco 风格训练目录也不影响 `Scaffold-GS`，因为它吃的是 `COLMAP` 场景，不是旧 checkpoint

## 最小 staging 方案

建议不要直接改动现有 `processed` 目录，而是单独建立一个 `Scaffold-GS` staging 场景目录，例如：

```text
third_party/Scaffold-GS/data/ruoshui/iteration001/
├── images -> /root/autodl-tmp/ruoshui/outputs/iteration-001/processed/images
└── sparse
    └── 0 -> /root/autodl-tmp/ruoshui/outputs/iteration-001/processed/colmap/sparse/0
```

优先建议使用软链接，而不是复制：

- 可以避免重复占用磁盘
- 不会破坏当前 `Iteration 001` 的原始实验产物
- 后续切到别的结构化 `GS` 路线时也容易复用

当前仓库已落地的 staging 脚本：

- `scripts/prepare_scaffoldgs_stage.sh`
- `scripts/run_scaffoldgs_train.sh`

已实际执行并生成：

- `outputs/iteration-003/scaffoldgs-stage/ruoshui/iteration001/images`
- `outputs/iteration-003/scaffoldgs-stage/ruoshui/iteration001/sparse/0`
- 并已用 mock `Scaffold-GS` 目录验证：`run_scaffoldgs_train.sh` 可正确创建 `data/ruoshui/iteration001` 软链接并输出 baseline 训练命令
- 已在本机下载完整源码压缩包：`/tmp/scaffoldgs-download/scaffoldgs.zip`
- 已验证该压缩包完整可解压，但当前按停机要求停在“未解压、未安装依赖、未启动真实训练”

## 最小训练入口

基于官方脚本，若水广场最小可执行入口可收敛为：

```bash
cd /path/to/Scaffold-GS
bash ./train.sh -d ruoshui/iteration001 -l baseline --gpu 0 --voxel_size 0.001 --update_init_factor 16 --appearance_dim 0 --ratio 1
```

说明：

- `ruoshui/iteration001` 对应 `data/ruoshui/iteration001`
- `voxel_size=0.001`、`update_init_factor=16`、`appearance_dim=0`、`ratio=1` 来自官方 `single_train.sh` 默认示例
- 这些值现在更适合作为“第一轮能跑起来”的起点，而不是已经调优过的最终配置
- 若使用当前仓库 staging 结果，只需把 `outputs/iteration-003/scaffoldgs-stage/ruoshui/iteration001` 映射或链接到 `Scaffold-GS/data/ruoshui/iteration001`
- 当前仓库已把这一步封装进 `scripts/run_scaffoldgs_train.sh --scaffold-dir /path/to/Scaffold-GS`

## 当前最小风险

### 风险 1：参数默认值未必最适合校园航拍场景

- 官方示例参数来自公开数据集，不一定最适合若水广场
- 但这不影响先做第一轮最小可运行验证

### 风险 2：目录结构需要 staging

- 当前不是数据缺失，而是路径层级不一致
- 这类问题属于低风险工程工作，不应阻塞路线判断

### 风险 3：显存与训练时间仍未知

- 当前还没有跑 `Scaffold-GS` 在若水广场 `180` 张子集上的真实耗时和显存曲线
- 这需要进入真实训练后再记录

## 当前判断

如果目标是“下一条最值得真的动手的重训路线”，当前应选：

1. `Scaffold-GS`
2. `Octree-GS`
3. `CityGaussian`

其中 `Scaffold-GS` 当前最适合作为第一条真实实验，因为：

- 数据接入最顺
- 不需要先解决 `LightGaussian` 那种格式桥接问题
- 比 `CityGaussian` 更轻
- 比 `Octree-GS` 少一层 `LOD` 学习成本

## 下一步建议

1. 已落一个 `Scaffold-GS` staging 脚本并完成一次实际 staging
2. 下一步是在真实训练机器上执行 `scripts/run_scaffoldgs_train.sh --scaffold-dir /path/to/Scaffold-GS --execute`
3. 跑第一轮 `baseline` 命令，再记录真实显存、耗时和主观结果

## 本次停点

- 可直接复用的源码包位置：`/tmp/scaffoldgs-download/scaffoldgs.zip`
- 当前仓库存在未完成尝试留下的本地目录：`experiments/Scaffold-GS/` 与 `.venv-scaffoldgs/`
- 下次开始时，优先使用已下载的 zip 解压到一个干净目录，再决定是否复用或清理上述未完成目录

## 2026-03-24 恢复补记

- 已将源码包解压到干净目录：`experiments/scaffoldgs-src-20260324/Scaffold-GS-main`
- 已确认当前机器存在 `CUDA 12.8` 工具链，`nvcc` 位于 `/usr/local/cuda/bin/nvcc`，但默认 shell 尚未把该目录加入 `PATH`
- 已确认当前系统 shell 中仍缺少 `ninja`
- 已尝试按官方 `environment.yml` 在线创建独立 `conda` 环境，但当前机器上的 `conda 24.4.0` 在拉取频道 `repodata` 时持续出现超时和空响应解析失败；因此当前真实阻塞已经从“脚本入口未打通”转为“训练环境尚未成功落地”
- 为避免下次继续黑箱排障，`scripts/run_scaffoldgs_train.sh` 已补上 `--conda-prefix`、`--cuda-bin` 与 `nvcc/ninja` 前置检查；后续只要环境能建起来，就可以直接用该脚本执行 baseline 训练
- 当前已验证一条可用替代环境路线：直接复用 `./.venv-iteration001` 的 `torch 2.10.0 + cu128` 环境，补装 `colorama / einops / lpips / laspy / torch-scatter`，并成功编译 `diff_gaussian_rasterization` 与 `simple_knn`
- 期间对 `simple-knn` 做了一个最小源码兼容修补：在 `submodules/simple-knn/simple_knn.cu` 补入 `<cfloat>`，以解决 `CUDA 12.8` 下 `FLT_MAX` 未定义的编译失败
- 已成功启动一次真实 `Scaffold-GS` baseline 训练，并确认 Python / CUDA 扩展 / staging 链路都已打通
- 已确认原始 `outputs/iteration-001/processed/colmap/sparse/0/cameras.bin` 中的唯一相机模型是 `OPENCV`，而当前 `Scaffold-GS` 读取器只接受 `PINHOLE / SIMPLE_PINHOLE`（代码里也兼容 `SIMPLE_RADIAL`）
- 已在本机通过 `apt` 安装 `COLMAP 3.7`
- 已完成一轮 `COLMAP image_undistorter`，产出去畸变后的新场景根目录：`outputs/iteration-003/scaffoldgs-undistorted`
- 已确认去畸变后的 `outputs/iteration-003/scaffoldgs-undistorted/sparse/cameras.bin` 相机模型变为 `PINHOLE`
- 已基于去畸变结果新增 staging：`outputs/iteration-003/scaffoldgs-stage-undistorted/ruoshui/iteration001`
- 已成功用该 undistorted staging 重新启动真实 `Scaffold-GS` baseline 训练，并完整跑完 `30000` step、测试渲染和指标评估
- 当前可见训练表现：
  - 输入相机：`179`
  - 初始化点数：约 `56079`
  - 启动后速度约 `28-30 it/s`
  - 训练期显存占用约 `5.6 GiB / 32.6 GiB`
  - 当前训练输出目录：`experiments/scaffoldgs-src-20260324/Scaffold-GS-main/outputs/ruoshui/iteration001/baseline/2026-03-24_22:55:43`
  - 完整训练耗时约 `16` 分钟 `19` 秒；渲染与评估额外约 `1` 分钟 `27` 秒
  - 最终测试指标：
    - `PSNR 16.2589`
    - `SSIM 0.3200`
    - `LPIPS 0.5592`
  - 训练日志中的测试阶段 `L1`：`0.1114`
  - 训练日志中的 train `PSNR`：`23.8783`
  - 渲染阶段测试 `FPS`：约 `298.15`
  - 当前结果目录总大小约 `1021 MiB`
  - 关键产物：
    - `point_cloud/iteration_30000`
    - `results.json`
    - `per_view.json`
    - `test/ours_30000/renders`
    - `test/ours_30000/errors`

## 2026-03-24 首轮结果复核结论

这一轮的结论已经从“能不能跑”推进到“值不值得继续”。

结论是：

- `Scaffold-GS` 这条链路已经被证明可跑通
- 但当前这轮 baseline 结果，主观质量和客观指标都明显落后于 `Iteration 001 splatfacto`
- 因此当前不应直接把它升级为新的默认主线，而应先降级为“可继续调参验证的备选路线”

### 与 `Iteration 001 splatfacto` 的对比

已知 `Iteration 001 splatfacto` 首轮评估指标：

- `PSNR 20.25`
- `SSIM 0.599`
- `LPIPS 0.338`

当前 `Scaffold-GS baseline` 指标：

- `PSNR 16.2589`
- `SSIM 0.3200`
- `LPIPS 0.5592`

从量化上看，这不是“各有优劣的接近水平”，而是当前 `Scaffold-GS baseline` 明显退化。

### 主观观察

抽查代表视角后，当前判断如下：

- 主结构稳定性：
  - 最好视角如 `00005` 仍能对齐道路、看台与球场大轮廓
  - 但许多视角的整体布局稳定性不如 `Iteration 001 splatfacto`
- 边缘噪声与 `floaters`：
  - `Scaffold-GS` 并没有稳定消除伪影
  - 在差视角如 `00020`，会出现更大尺度的拉丝、爆闪和结构错配
- 底部离群区域：
  - 这轮结果没有显示出对底部或边缘脏区的明显压制优势
- 局部清晰度：
  - 即使在较好的视角中，建筑边缘、树冠纹理和操场线条也普遍更糊
  - 当前观感更像“整体被抹平”，不是“更干净但更稳定”

### 当前判断

对若水广场当前 `180` 张子集而言：

- `Scaffold-GS` 已证明工程接入可行
- 但首轮 baseline 还没有证明它在当前场景上优于现有 `splatfacto`
- 因此它现在更适合作为“后续带假设的参数调优候选”，而不是立即接管当前主线

更现实的下一步应改为：

1. 先保留当前 `Scaffold-GS` 可运行环境与 undistorted 数据入口
2. 主线优先回到现有 `splatfacto` 结果的定向清理与复训设计
3. 若之后继续投入 `Scaffold-GS`，必须带着明确假设进入下一轮，例如：
   - 是否需要改 `voxel_size`
   - 是否需要调整 `appearance_dim` 或密度更新策略
   - 是否需要换更适合校园航拍的子集或遮罩
4. 在没有明确参数假设前，不应继续机械追加同类 baseline 重跑

## 下次最小继续动作

1. 保留当前已验证可用的训练环境：`./.venv-iteration001 + /usr/local/cuda/bin`
2. 保留当前 undistorted 数据入口：`outputs/iteration-003/scaffoldgs-undistorted`
3. 主线优先回到现有 `splatfacto` 结果，设计首个定向清理/复训实验
4. 若要继续投入 `Scaffold-GS`，必须先写清参数假设，再决定是否重跑
5. 如需重新启动，使用：

```bash
bash scripts/run_scaffoldgs_train.sh \
  --scaffold-dir /root/autodl-tmp/ruoshui/experiments/scaffoldgs-src-20260324/Scaffold-GS-main \
  --stage-root /root/autodl-tmp/ruoshui/outputs/iteration-003/scaffoldgs-stage-undistorted/ruoshui/iteration001 \
  --execute
```

6. 不在没有明确假设的前提下继续机械追加同类 baseline

## 参考来源

- `Scaffold-GS` README：<https://github.com/city-super/Scaffold-GS>
- `Scaffold-GS` 项目页：<https://city-super.github.io/scaffold-gs/>
- `single_train.sh`：<https://raw.githubusercontent.com/city-super/Scaffold-GS/main/single_train.sh>
- `train.sh`：<https://raw.githubusercontent.com/city-super/Scaffold-GS/main/train.sh>

## 备注

上面的 staging 路径是针对当前仓库结构给出的工程建议；官方文档只要求场景根目录满足 `images + sparse/0`。
