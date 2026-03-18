# Iteration 001 Validation

## 实验信息

- 迭代编号：`Iteration 001`
- 日期：`2026-03-18`
- 负责人：`Codex + tazdingo`
- 目标：验证 `PoC 001` 的均匀抽样素材是否足以支撑第一轮空中版 `3DGS` 可行性判断

## 输入素材

- 素材来源目录：`assets/raw`
- 素材筛选规则：使用 `python3 scripts/select_poc_subset.py --sample-size 180` 基于全量素材做分层均匀抽样
- 图片数量：`180`
- 分辨率：`4000x3000`
- 总体积：约 `1.10 GB`（`1181030339` bytes）
- 目录分布：`101MEDIA = 106`，`102MEDIA = 74`
- 首张素材：`assets/raw/101MEDIA/DJI_0039.JPG`
- 末张素材：`assets/raw/102MEDIA/DJI_0676.JPG`
- 预计覆盖区域：待结合实际场景与重建结果补充
- 已知缺失区域：待补充

## 实验链路

- 相机位姿恢复方案：`COLMAP`
- 训练方案：首轮沿用基础 `3DGS` 训练链路，具体实现待补充
- 导出方案：待补充
- Viewer / Web 集成方案：本轮暂不进入集成，仅评估结果是否值得继续
- 关键参数：待记录

## 本轮实际执行记录

### 2026-03-18 环境与输入准备

- 已执行：`python3 scripts/materialize_poc_subset.py --mode symlink`
- 执行结果：成功物化 `180` 张 staging 图片
- staging 目录：`assets/staging/poc-001/images`
- manifest：`assets/staging/poc-001/manifest.json`
- 独立环境：`./.venv-iteration001`
- 独立环境 Python：`3.11.15`
- 本机系统 Python：`3.14.3`
- 初始环境检查时，`colmap`、`ffmpeg`、`ns-process-data`、`ns-train` 均不可用；后续已完成安装与验证

### 2026-03-18 安装尝试

- 已创建：`uv venv .venv-iteration001 --python 3.11`
- 已执行：`uv pip install --python .venv-iteration001/bin/python nerfstudio`
- 已确认：`./.venv-iteration001/bin/ns-process-data` 与 `./.venv-iteration001/bin/ns-train` 可用
- 环境修复：`numpy 2.4.3 -> 1.26.4`，用于修复 `opencv-python 4.6.0.66` 的 ABI 冲突
- 兼容补丁：新增 `scripts/colmap_compat.sh`，最初用于兼容 `nerfstudio 0.3.4` 与 `COLMAP 4.0.1`
- 环境升级：已将 `nerfstudio` 升级到 `1.1.5`，以获得 `splatfacto` 训练能力

### 2026-03-18 首轮处理命令

- 首次尝试：`ns-process-data images --data assets/staging/poc-001/images --output-dir outputs/iteration-001/processed`
- 首次失败原因：`numpy 2.x` 与 `opencv-python 4.6.0.66` 不兼容，`cv2` 导入失败
- 第二次失败原因：`nerfstudio 0.3.4` 无法解析 `COLMAP 4.0.1` 版本号
- 第三次失败原因：`COLMAP 4.0.1` 将 `--SiftExtraction.use_gpu` / `--SiftMatching.use_gpu` 调整为 `--FeatureExtraction.use_gpu` / `--FeatureMatching.use_gpu`
- 当前运行命令：`ns-process-data images --data assets/staging/poc-001/images --output-dir outputs/iteration-001/processed --colmap-cmd scripts/colmap_compat.sh --matching-method exhaustive`
- 当前进度快照：`ns-process-data` 已完成；`COLMAP` 匹配跑满 `16110` 对图像对，`mapper` 与 `bundle_adjuster` 已完成，并产出 `outputs/iteration-001/processed/colmap/sparse/0` 与 `outputs/iteration-001/processed/transforms.json`
- 训练尝试结果：已将 `nerfstudio` 升级到 `1.1.5` 并成功启动 `splatfacto` 初始化，但在首个训练 step 卡在 `gsplat` 的 CUDA-only 依赖

## 验证方式

- 是否完成稀疏重建：已完成，`COLMAP` 为 `179 / 180` 张图片恢复位姿
- 是否得到可查看的 splat / 模型：未得到；训练在首个 step 前因 `gsplat` 缺少 CUDA 后端而中断
- 是否可在本地打开：待补充
- 是否可切换机位：待补充
- 是否具备基本纪念展示价值：待补充

## 结果记录

- 质量判断：位姿恢复结果明显好于“仅能跑通”的最低标准，`179 / 180` 张图成功出位姿；但本机无法完成 `splatfacto` 训练
- 优点：`PoC 001` 输入 staging 稳定；位姿恢复覆盖率达到 `99.44%`；`transforms.json` 与 `sparse_pc.ply` 已产出
- 问题区域：本机为 Apple Silicon + `MPS`，而 `gsplat` 当前仍要求 CUDA 后端；因此 `splatfacto` 在首个 step 即失败
- 噪点 / 漂浮情况：待补充
- 文件体积：staging 输入与原始素材一致，训练产物待补充
- 加载体验：待补充
- 截图或视频记录：待补充

## 结论

- 当前素材是否足以继续：从位姿恢复结果看，值得继续
- 当前链路是否值得继续：值得继续，但训练需切换到具备 CUDA 的机器
- 下一轮最该调整什么：将 `outputs/iteration-001/processed` 搬到 NVIDIA CUDA 环境，继续运行 `ns-train splatfacto`
- 是否进入 Web 原型阶段：待补充

## 记录规范

- 所有素材引用都使用相对路径，不使用裸文件名
- 本轮只记录 `PoC 001`，不混入其他素材批次
- 真正开始跑实验后，把实际工具、命令、参数和产物路径继续补到本文件


## 当前产物

- 数据集目录：`outputs/iteration-001/processed`
- 位姿文件：`outputs/iteration-001/processed/transforms.json`
- 稀疏重建：`outputs/iteration-001/processed/colmap/sparse/0`
- 点云文件：`outputs/iteration-001/processed/sparse_pc.ply`
- 训练尝试配置：`outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_024928/config.yml`


## CUDA 续跑入口

- 继续训练时，优先参考 `docs/iterations/iteration-001-cuda-handoff.md`
