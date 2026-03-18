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
- 训练方案：`nerfstudio==1.1.5` + `splatfacto`
- 导出方案：`ns-eval` 导出评估指标与静态渲染；插值视频在无系统 `ffmpeg` 的当前机器上通过 Nerfstudio Python API 导出帧序列，再用 `OpenCV VideoWriter` 封装成 `mp4`
- Viewer / Web 集成方案：本轮暂不进入集成，仅评估结果是否值得继续
- 关键参数：评估阶段需显式导出 `CUDA_HOME=/usr/local/cuda`、`PATH=./.venv-iteration001/bin:/usr/local/cuda/bin:$PATH`、`MAX_JOBS=8`、`TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`

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

### 2026-03-18 NVIDIA CUDA 续跑

- 机器信息：`NVIDIA GeForce RTX 5090`，驱动 `580.105.08`，显存 `32607 MiB`
- 系统 Python：`3.12.3`
- 训练环境：当前机器无 `uv`、无 `python3.11`，改用 `python3 -m venv .venv-iteration001`
- 依赖安装：`./.venv-iteration001/bin/pip install -U pip setuptools wheel`
- 依赖安装：`./.venv-iteration001/bin/pip install nerfstudio==1.1.5`
- 环境确认：`torch 2.10.0+cu128`，`cuda True`，`device_count 1`，`nerfstudio 1.1.5`，`gsplat 1.4.0`
- 首次 CUDA 机器训练失败原因：`gsplat` 仅通过 `PATH` 查找 `nvcc`，而当前 shell 未包含 `/usr/local/cuda/bin`；同时 JIT 编译还要求 `ninja` 出现在 `PATH`
- 修复方式：显式导出 `CUDA_HOME=/usr/local/cuda`，并将 `./.venv-iteration001/bin` 与 `/usr/local/cuda/bin` 加入 `PATH`
- `gsplat` JIT 编译验证命令：

```bash
export CUDA_HOME=/usr/local/cuda
export PATH=/path/to/ruoshui/.venv-iteration001/bin:/usr/local/cuda/bin:$PATH
export MAX_JOBS=8
./.venv-iteration001/bin/python - <<'PY'
import gsplat.cuda._backend as b
print(b._C is not None)
PY
```

- 训练启动命令：

```bash
export CUDA_HOME=/usr/local/cuda
export PATH=/path/to/ruoshui/.venv-iteration001/bin:/usr/local/cuda/bin:$PATH
export MAX_JOBS=8
./.venv-iteration001/bin/ns-train splatfacto \
  --output-dir outputs/iteration-001/train \
  --vis tensorboard \
  nerfstudio-data \
  --data outputs/iteration-001/processed
```

- 成功续跑目录：`outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630`
- 当前进度快照：训练已完整跑到 `29999 / 30000` step，并正常退出
- 已生成产物：`config.yml`、`events.out.tfevents...`、`nerfstudio_models/step-000029999.ckpt`
- 当前训练目录体积：`du -sh` 实测约 `3.8 GB`

### 2026-03-18 headless 评估与插值导出

- 评估命令：

```bash
export CUDA_HOME=/usr/local/cuda
export PATH=/path/to/ruoshui/.venv-iteration001/bin:/usr/local/cuda/bin:$PATH
export MAX_JOBS=8
export TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1
./.venv-iteration001/bin/ns-eval \
  --load-config outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630/config.yml \
  --output-path outputs/iteration-001/eval/metrics.json \
  --render-output-path outputs/iteration-001/eval/renders
```

- 评估结果：成功加载 `step-000029999.ckpt` 并输出 `metrics.json` 与 `17` 张 `eval` 渲染图
- 已确认：在 `torch 2.10.0+cu128` 下，`nerfstudio 1.1.5` 的 `ns-eval` 需要显式导出 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`，否则会被 `torch.load` 的默认 `weights_only=True` 行为阻塞
- 首次插值视频尝试：直接运行 `ns-render interpolate ... --output-path outputs/iteration-001/eval/interpolate.mp4` 时失败；失败原因不是 checkpoint，而是当前机器 shell 中无系统级 `ffmpeg`
- 当前绕路：以 Nerfstudio Python API 调用 `RenderInterpolated(output_format='images')` 导出 `320` 帧 PNG 到 `outputs/iteration-001/eval/interpolate-frames/`，再用 `OpenCV VideoWriter` 封装成 `outputs/iteration-001/eval/interpolate.mp4`
- 已生成视频：`outputs/iteration-001/eval/interpolate.mp4`，文件大小约 `29 MB`

## 验证方式

- 是否完成稀疏重建：已完成，`COLMAP` 为 `179 / 180` 张图片恢复位姿
- 是否得到可查看的 splat / 模型：已完成首轮训练并生成最终 checkpoint；已补齐 `metrics.json`、`17` 张 `eval` 渲染图与 `320` 帧插值视频
- 是否可在本地打开：已在无界面环境完成 headless 导出；当前未做 GUI viewer 打开验证
- 是否可切换机位：已通过 `pose-source eval` 的插值轨迹成功导出连续视频，说明当前模型支持离线连续机位渲染
- 是否具备基本纪念展示价值：具备“可判断”的纪念展示基础，但质量尚不足以直接进入 `Web` 原型阶段

## 结果记录

- 质量判断：首轮结果已超过“完全失败”的门槛，校园主结构在部分视角中可辨识，但整体仍属于“可判断、不可发布”的质量。`ns-eval` 指标为 `PSNR 20.25`、`SSIM 0.599`、`LPIPS 0.338`
- 优点：`PoC 001` 输入 staging 稳定；位姿恢复覆盖率达到 `99.44%`；`transforms.json` 与 `sparse_pc.ply` 已产出
- 优点：`splatfacto` 已在 `RTX 5090` 机器上完整跑完，并产出 `step-000029999.ckpt`
- 优点：在较好的视角下，道路、楼体、球场和跑道等校园主结构可以辨识，说明当前素材并非完全无效
- 问题区域：当前 CUDA 机器虽然具备工具链，但 shell 默认 `PATH` 未包含 `/usr/local/cuda/bin` 与 `./.venv-iteration001/bin`；若不显式导出，`gsplat` 会误判“无 CUDA toolkit”
- 问题区域：树木密集、边缘覆盖不足或视角变化较大的区域最不稳定；若干评估视角中，画面左侧、底部或前景会被大块刷状伪影遮挡
- 噪点 / 漂浮情况：存在明显且不可忽视的 `floaters`。它们不是零星噪点，而是大片叶片状、拉丝状 splat 漂浮物，在多段插值视频中会持续闯入近景并遮挡主体结构
- 文件体积：训练目录 `outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630` 实测约 `3.8 GB`；评估目录 `outputs/iteration-001/eval` 约 `33 MB`；插值视频 `interpolate.mp4` 约 `29 MB`
- 加载体验：当前仅完成 headless 评估；`metrics.json` 记录的离线评估推理速度约为 `2.52 fps`，尚不能直接等价为 `Web` 端加载体验
- 截图或视频记录：`outputs/iteration-001/eval/metrics.json`、`outputs/iteration-001/eval/renders/`（`17` 张）、`outputs/iteration-001/eval/interpolate-frames/`（`320` 帧）、`outputs/iteration-001/eval/interpolate.mp4`

## 结论

- 当前素材是否足以继续：足以继续做下一轮验证，但还不足以支撑直接进入 `Web` 展示阶段
- 当前链路是否值得继续：值得继续；`COLMAP -> splatfacto -> headless eval` 的链路已经闭环，当前主要问题更像素材组织与覆盖结构，而不是训练环境本身
- 下一轮最该调整什么：先做更细的五向分组或连续段分组，再复跑位姿恢复与训练，不建议在当前均匀混合抽样结果上直接盲目扩大素材范围
- 是否进入 Web 原型阶段：暂不进入。当前结果能证明“链路可跑通、结构可辨识”，但 `floaters`、边缘拉花和局部结构不稳定还明显过重

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
- CUDA 续跑目录：`outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630`
- 最终 checkpoint：`outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630/nerfstudio_models/step-000029999.ckpt`


## CUDA 续跑入口

- 继续训练时，优先参考 `docs/iterations/iteration-001-cuda-handoff.md`
