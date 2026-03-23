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

## 参考来源

- `Scaffold-GS` README：<https://github.com/city-super/Scaffold-GS>
- `Scaffold-GS` 项目页：<https://city-super.github.io/scaffold-gs/>
- `single_train.sh`：<https://raw.githubusercontent.com/city-super/Scaffold-GS/main/single_train.sh>
- `train.sh`：<https://raw.githubusercontent.com/city-super/Scaffold-GS/main/train.sh>

## 备注

上面的 staging 路径是针对当前仓库结构给出的工程建议；官方文档只要求场景根目录满足 `images + sparse/0`。
