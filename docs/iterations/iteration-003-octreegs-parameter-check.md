# Iteration 003 Octree-GS Parameter Check

## 目标

把 `Octree-GS` 从“值得成为下一条真实实验路线”的判断，推进到“最小单场景 baseline 该怎么起”的参数级核查。

## 输入

- `docs/iterations/iteration-003-octreegs-entry.md`
- `Octree-GS` README
- `Octree-GS` `single_train.sh`
- `Octree-GS` `train.sh`
- `Octree-GS` `environment.yml`
- `Octree-GS` `scene/dataset_readers.py`
- 若水广场现有 `outputs/iteration-001/processed`
- 若水广场现有 undistorted staging：`outputs/iteration-003/scaffoldgs-stage-undistorted/ruoshui/iteration001`

## 结论先行

当前结论是：

- `Octree-GS` 的单场景入口已经足够清晰，可以进入“是否下载源码并落环境”的决策阶段
- 在数据入口上，它与 `Scaffold-GS` 一样，必须使用 undistorted 的 `PINHOLE / SIMPLE_PINHOLE / SIMPLE_RADIAL` 相机
- 因此若水广场如果继续推进 `Octree-GS`，应直接复用现有 undistorted staging 思路，而不是回到原始 `OPENCV` 相机场景

## 官方单场景入口

`single_train.sh` 官方默认参数如下：

```bash
scene="db/playroom"
exp_name="baseline"
gpu=-1
ratio=1
resolution=-1
appearance_dim=0

fork=2
base_layer=12
visible_threshold=0.9
dist2level="round"
update_ratio=0.2

progressive="True"
dist_ratio=0.999
levels=-1
init_level=-1
extra_ratio=0.25
extra_up=0.01

./train.sh ...
```

`train.sh` 会进一步固定：

- `iterations=40000`
- 默认打开 `--eval`
- 输出目录为 `outputs/<dataset>/<scene>/<exp_name>/<time>`

这意味着若水广场的最小 baseline 入口可以先对齐成：

```bash
./train.sh \
  -d ruoshui/iteration001 \
  -l baseline \
  --gpu 0 \
  -r -1 \
  --ratio 1 \
  --appearance_dim 0 \
  --fork 2 \
  --base_layer 12 \
  --visible_threshold 0.9 \
  --dist2level round \
  --update_ratio 0.2 \
  --progressive True \
  --dist_ratio 0.999 \
  --levels -1 \
  --init_level -1 \
  --extra_ratio 0.25 \
  --extra_up 0.01
```

当前这组值不代表“适合若水广场”，只代表“与官方单场景默认 baseline 一致”。

## 对若水广场最重要的参数理解

### 可以先保持官方默认的部分

- `ratio=1`
  - 先不降低初始化点云采样密度
- `appearance_dim=0`
  - 与当前 `Scaffold-GS` baseline 起点一致，先避免额外引入外观嵌入复杂度
- `dist2level=round`
  - 先沿用官方默认映射
- `update_ratio=0.2`
- `progressive=True`
- `dist_ratio=0.999`
- `levels=-1`
- `init_level=-1`
- `extra_ratio=0.25`
- `extra_up=0.01`

这些参数先不改，原因不是它们一定正确，而是当前还没有若水广场自己的 `Octree-GS` 基线可对照。

### 需要特别记住的部分

- `fork=2`
  - 这直接关系到 `LOD` 细分结构，是 `Octree-GS` 的核心参数之一
- `base_layer=12`
  - 官方脚本直接写死了一个值；但参数定义里也支持 `<0` 时按场景自适应
- `visible_threshold=0.9`
  - 这个值明显不像普通训练超参数，而更像和 anchor / 频率筛选有关

当前判断是：

- 第一轮不要一上来改太多
- 但 `base_layer=12` 是后续最值得优先怀疑的参数之一，因为若水广场和 `db/playroom` 的场景尺度差别非常大

## 对若水广场最关键的数据前提

### 1. 必须复用 undistorted 相机

`scene/dataset_readers.py` 在读取 `COLMAP` 相机时，只接受：

- `SIMPLE_PINHOLE`
- `SIMPLE_RADIAL`
- `PINHOLE`

否则会直接报：

- only undistorted datasets supported

这与 `Scaffold-GS` 的限制几乎一致。

因此当前判断很明确：

- 原始 `outputs/iteration-001/processed/colmap/sparse/0` 的 `OPENCV` 相机不能直接喂给 `Octree-GS`
- 必须复用已经去畸变过的结果

### 2. staging 可以直接复用现有思路

因为 `Octree-GS` 也要求场景根目录是：

- `images/`
- `sparse/0`

所以若水广场下一步完全可以沿用当前 `Scaffold-GS` 的 staging 设计，只是把目标从 `Scaffold-GS/data/...` 换成 `Octree-GS/data/...`。

更具体地说，若水广场的推荐单场景源应改为：

- `outputs/iteration-003/scaffoldgs-stage-undistorted/ruoshui/iteration001`

这个命名虽然带 `scaffoldgs`，但它本质上已经是一个合格的 undistorted `COLMAP` 场景根目录。

## 环境判断

官方 `environment.yml` 期望：

- `python=3.7.13`
- `pytorch=1.12.1`
- `cudatoolkit=11.6`
- `pytorch-scatter`
- `einops / wandb / lpips / laspy / jaxtyping / colorama / opencv-python`
- 本地编译安装：
  - `submodules/diff-gaussian-rasterization`
  - `submodules/simple-knn`

这意味着：

- 它的环境代际比当前机器常用环境明显更老
- 当前若水广场机器主要是 `CUDA 12.8 + torch 2.10.0`
- 因此环境兼容风险大概率高于 `Scaffold-GS`

但也有一个好消息：

- 依赖族谱和 `Scaffold-GS` 非常接近
- 因此当前已经打通过的扩展编译经验，后续很可能可以复用一部分

## 当前判断

如果现在只回答“要不要进入下一步”，当前答案是：

- 值得

原因：

- 数据前提已经明确
- 单场景训练命令已经明确
- 当前最真实的新增风险主要是环境兼容与 `LOD` 参数理解
- 这已经足够支持“开始准备源码下载与环境落地”这个下一小步

## 当前推荐 baseline

若水广场的第一轮 `Octree-GS baseline`，当前建议遵守三个原则：

1. 先用 undistorted staging
2. 先尽量贴官方 `single_train.sh` 默认参数
3. 除非被环境或尺度问题逼迫，不在首轮同时改很多 `LOD` 参数

## 下一步

1. 开始 `Octree-GS` 源码下载与环境落地
2. 优先尝试复用当前已知可用的 CUDA 扩展编译经验，而不是先深挖调参
3. 一旦环境打通，第一轮只跑一个最贴官方默认的 baseline

## 2026-03-25 落地补记

这一步已经从“值得不值得落环境”推进到了“本机是否能真实落地”。

当前已确认：

- 已下载源码包到 `/tmp/octreegs-download/octreegs.zip`
- 已解压到干净目录：`experiments/octreegs-src-20260325/Octree-GS-main`
- 其依赖族谱与 `Scaffold-GS` 高度接近，核心扩展仍是：
  - `submodules/diff-gaussian-rasterization`
  - `submodules/simple-knn`
- `simple-knn` 在当前机器上同样需要补入 `<cfloat>` 以兼容 `CUDA 12.8`

### 本机环境验证结果

当前已直接复用：

- `./.venv-iteration001`
- `/usr/local/cuda/bin`

并完成：

- 安装 `colorama / einops / lpips / laspy / jaxtyping / wandb / opencv-python / ninja`
- 用 `--no-build-isolation` 成功编译并安装：
  - `submodules/diff-gaussian-rasterization`
  - `submodules/simple-knn`
- 成功通过最小 import 验证：
  - `import diff_gaussian_rasterization`
  - `import simple_knn`
  - `import train`

这意味着：

- `Octree-GS` 当前已经不再停留在“纸面值得做”
- 它在若水广场本机上已经具备进入真实 baseline 训练的环境前提

### 当前判断更新

原来的待答问题是：

- `Octree-GS` 是否值得进入源码下载与环境落地

现在这个问题已经可以回答为：

- 值得，而且源码与环境落地已经完成到足以发起首轮 baseline 的程度

当前剩下的更小下一步不再是“要不要装”，而是：

- 是否补一个若水广场专用 launcher / staging 触发脚本
- 然后直接启动首轮 `Octree-GS baseline`
