# Tasks

## 当前任务池

### P0

- [x] 确认项目名为“若水广场”
- [x] 确认第一版只做空中版 `3DGS Web` 展示
- [x] 确认第一版先只聚焦桌面端
- [x] 将原始航拍素材放入 `assets/raw`
- [x] 建立素材目录规范与命名说明
- [x] 统计素材总数、分辨率与体积
- [x] 输出素材盘点文档
- [x] 选定首个 `PoC` 素材子集
- [x] 选择首个 `3DGS` 实验链路
- [x] 输出资产可行性验证记录模板
- [x] 输出当前场景的可交付体积基线
- [x] 形成体积优化与渐进式加载调研计划
- [x] 评估当前 `3DGS`、`2DGS`、大场景 `GS` 优化算法与双阶段加载方案的取舍
- [x] 完成 `Iteration 003` 的 `GS` 模型优化首个定向清理实验
- [x] 完成 `Octree-GS` 单场景训练参数核查
- [x] 判断 `Octree-GS` 是否值得进入源码下载与环境落地
- [x] 补一条若水广场专用 `Octree-GS` 启动入口
- [x] 发起首轮 `Octree-GS baseline` 训练

### P1

- [ ] 初始化前端项目
- [ ] 选定 `3DGS Web viewer` 集成方案
- [ ] 定义热点内容 `JSON` 结构
- [ ] 设计首页与场景页信息结构
- [ ] 明确首页纪念文案的表达方向

### P2

- [ ] 明确部署方式
- [ ] 收集第一批故事点位内容
- [ ] 选择首批热点地点
- [ ] 评估是否需要基础移动端兼容

## 最近结论

- 当前原始素材区先不改名，规范已写入 `docs/assets/raw-asset-policy.md`
- 第一优先级是“高质量纪念展示”，不是开放发帖
- 大方向使用 `Web` 是正确的，因为它最容易被打开、传播和体验
- 第一版不先做数据库、登录和社区系统
- 当前最关键风险已经切到“场景能否以 `Web MVP` 可接受的体积被交付、加载和体验”
- `Iteration 001` 首轮 headless 评估指标为 `PSNR 20.25 / SSIM 0.599 / LPIPS 0.338`
- 当前结果已能辨识校园主结构，但存在明显 `floaters`、边缘拉花和局部遮挡伪影
- 当前子集已经完成“效果验证是否达到主观要求”的任务，不再优先继续挑更好子集
- 下一步主线改为场景交付调研：体积优化、渐进式加载和更适合 `Web MVP` 的表示形式选择
- 最终 checkpoint `outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630/nerfstudio_models/step-000029999.ckpt` 当前约 `3.2 GB`
- 当前 Nerfstudio 数据格式支持给每帧补 `mask_path`；若边缘很多落在校外区域，下一轮可优先加 per-image campus mask
- `Iteration 002` 已拿到首轮交付体积基线：默认 `sh_coeffs` 导出约 `1.10 GiB`，`rgb` 导出约 `267 MiB`
- `ns-export` 在当前 `torch 2.10` 环境下也需要显式导出 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`
- 仅切换到 `rgb` 颜色表示即可比默认导出减重约 `76%`，但当前单文件资产仍偏重，不适合直接作为 `Web MVP` 首屏完整场景
- `rgb` 导出做 `gzip -9` / `zstd -19` 后也只能压到约 `206.61 MiB` / `201.41 MiB`，说明传输压缩不是当前问题的主解
- PlayCanvas `splat-transform` 虽声明支持 `.ply`，但对当前 Nerfstudio 导出的 `export-rgb/splat.ply` 实测报 `Unsupported data`
- 当前更现实的首个 Web 原型候选是 `GaussianSplats3D` 的 `PLY / ksplat` 路线，而不是先押注 PlayCanvas `compressed.ply / sog`
- 已新增 `GaussianSplats3D` 最小试页：`experiments/iteration-002-gaussiansplats3d/index.html`
- 用户已实测：原始 `rgb PLY` 在浏览器里交互流畅，但底部噪声高斯明显，整体体积范围远大于有效区域
- 已新增 `scripts/gaussian_ply_tools.py`，并产出 `export-rgb-summary.json`、`crop-zmin-p005`、`crop-p05-p995`
- 当前主要脏区不是“很多普通离群点”，而是“少量极大尺度离群高斯”；仅裁掉 `z` 轴最低 `0.5%` 高斯，就能去掉几乎全部底部尺度体积代理
- 当前默认预览组合已经定为：`crop-p05-p995 + 14x`
- 下一 session 的主线切回 `GS` 模型优化，不再继续投入 viewer 小调
- 已创建 `Iteration 003` 实验计划，但当前优先级已调整为：先筛选 `2DGS`、大场景 `GS` 与压缩型 `GS` 算法路线，再决定是否继续沿当前 `splatfacto` 主线做定向清理、空间裁切、遮罩和复训
- 现阶段不建议从 `180` 张直接跳到 `1600+` 张全量训练；当前主要风险已转向交付体积，而不是先赌“更多图一定更好”
- 若沿用当前 `COLMAP exhaustive matching` 思路，图像对数量会从 `180` 张时的 `16110` 对抬到 `1600` 张时的 `1279200` 对，或 `1637` 张时的 `1339066` 对，约为当前的 `79x-83x`
- 若要扩量，优先做 `300-600` 张的结构化扩容实验，而不是直接全量灌入

## 迭代记录模板

### Iteration X

- 目标：
- 输入：
- 输出：
- 验证方式：
- 结果：
- 问题：
- 下一步：

### Iteration 001

- 目标：完成 `PoC 001` 首轮 `splatfacto` 训练后的 headless 质量评估
- 输入：`180` 张均匀抽样图片、`outputs/iteration-001/processed`、训练目录 `outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630`
- 输出：`outputs/iteration-001/eval/metrics.json`、`outputs/iteration-001/eval/renders/`、`outputs/iteration-001/eval/interpolate.mp4`
- 验证方式：运行 `ns-eval`，检查 `PSNR / SSIM / LPIPS`，抽查 `17` 张 `eval` 渲染图，并检查 `320` 帧插值视频
- 结果：校园道路、楼体、球场和跑道在部分视角中可辨识，说明链路和素材并非无效；但多视角存在明显 `floaters` 和边缘拉花，暂不进入 `Web` 原型阶段
- 问题：`nerfstudio 1.1.5` 在 `torch 2.10` 下做 `ns-eval` 需要 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`；当前机器 shell 无系统 `ffmpeg`，插值视频需走导帧加 `OpenCV` 封装；最终 checkpoint 当前约 `3.2 GB`
- 下一步：先做更细的五向分组或连续段分组，并评估 per-image campus mask，再复跑位姿恢复与训练，最后再决定是否扩大素材范围

### Iteration 002

- 目标：导出当前场景的真实交付资产，建立 `Web MVP` 评估所需的体积基线
- 输入：`docs/iterations/iteration-002.md`、训练目录 `outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630`
- 输出：`outputs/iteration-002/export-default/splat.ply`、`outputs/iteration-002/export-rgb/splat.ply`、`outputs/iteration-002/transfer/splat.rgb.ply.gz`、`outputs/iteration-002/transfer/splat.rgb.ply.zst`
- 验证方式：运行 `ns-export gaussian-splat` 的默认导出与 `rgb` 对照导出，并对 `rgb` 产物继续做 `gzip -9` / `zstd -19` 压缩；再用 PlayCanvas `splat-transform` 与官方 viewer 文档做首轮兼容性核查
- 结果：默认 `sh_coeffs` 导出约 `1.10 GiB`，`rgb` 导出约 `267 MiB`；`rgb + gzip -9` 约 `206.61 MiB`，`rgb + zstd -19` 约 `201.41 MiB`；PlayCanvas `splat-transform` 对当前 Nerfstudio `PLY` 实测报 `Unsupported data`；已补一个 `GaussianSplats3D` 最小试页并验证静态访问路径成立；用户已实测原始 `rgb PLY` 可流畅交互
- 问题：`ns-export` 在当前环境下也需要 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`；即使切到 `rgb` 并叠加传输压缩，资产仍处于 `200 MiB` 量级，不适合直接作为 `Web MVP` 首屏完整场景；同时底部大尺度离群高斯会把场景体积范围拉得远大于有效区域
- 下一步：保留 `crop-p05-p995 + 14x` 作为当前预览入口，并把下一轮工作重心转到 `GS` 模型优化：更精确的校园区域裁切、per-image campus mask、素材重组和复训方案

## 下一步建议

最优先建议先做下面这一个：

- 先基于当前已收敛的预览入口，转向 `GS` 模型优化方案设计与实验拆分

建议标准包括：

- 明确训练 checkpoint、默认导出、`rgb` 导出和 `Web` 实际传输资产四者的体积差异
- 至少列出 `3-4` 条可行路线：例如裁切 / 剪枝 / 压缩、渐进式加载、双阶段加载、替代高斯表示
- 每条路线都给出对当前项目的价值、风险、验证方式和停止条件
- 产出一个可执行的小型调研计划，而不是停留在概念讨论

当前更小的下一步可拆成：

- 以 `crop-p05-p995 + 14x` 作为当前查看基线
- 为下一轮 `GS` 模型优化列出候选动作：per-image campus mask、五向/连续段重组、小规模复训、以及更精确的空间裁切
- 列出现有 `3DGS` 路线下的减重手段：裁切、剪枝、简化颜色表示、分层加载
- 为路线 A / B / C 补一版带验证方式和停止条件的调研卡

最新进展：

- `docs/iterations/iteration-003.md` 已创建，并已补入算法路线筛选轴：`2DGS`、大场景 `GS`、压缩型 `GS`
- `docs/iterations/iteration-003-algorithm-screening.md` 已创建，并在“允许重训”的前提下将当前优先级重排为：`Scaffold-GS -> Octree-GS -> CityGaussian` 为训练主线，`LightGaussian / 2DGS / Mip-Splatting` 为第二层优化分支
- `docs/iterations/iteration-003-access-check.md` 已创建；当前接入核查结论已重排为：结构化 `GS` 的最小入口优先看 `Scaffold-GS`，其次是 `Octree-GS`，`LightGaussian` 后移为交付压缩候选
- `docs/iterations/iteration-003-scaffoldgs-entry.md` 已创建；当前核查结论为：若水广场现有 `processed/images + colmap/sparse/0` 已足够进入 `Scaffold-GS` 最小重训准备阶段，主要只差一层 staging 目录
- 已新增 `scripts/prepare_scaffoldgs_stage.sh` 与 `scripts/run_scaffoldgs_train.sh`，并完成一次 mock 干跑验证
- 已在本机下载完整源码压缩包：`/tmp/scaffoldgs-download/scaffoldgs.zip`，并已额外解压到干净目录：`experiments/scaffoldgs-src-20260324/Scaffold-GS-main`
- 已确认当前机器的真实环境阻塞：`/usr/local/cuda/bin/nvcc` 存在但默认 shell 未入 `PATH`，系统中也暂无 `ninja`
- 已确认当前在线创建官方 `Scaffold-GS` `conda` 环境仍受 `repodata` 超时与空响应解析失败阻塞，尚未成功进入真实训练
- `scripts/run_scaffoldgs_train.sh` 已补充 `--conda-prefix`、`--cuda-bin` 与 `nvcc/ninja` 前置检查，避免环境未就绪时直接黑箱失败
- 已验证可直接复用 `./.venv-iteration001` 作为当前 `Scaffold-GS` 运行环境，并成功补齐 `torch-scatter`、`diff_gaussian_rasterization` 与 `simple_knn`
- 已成功发起一次真实 `Scaffold-GS` baseline 训练；期间已确认原始 `outputs/iteration-001/processed/colmap/sparse/0/cameras.bin` 为 `OPENCV` 相机模型，因此读取阶段会失败
- 已在本机通过 `apt` 安装 `COLMAP 3.7`
- 已完成 `COLMAP image_undistorter`，产出去畸变场景目录：`outputs/iteration-003/scaffoldgs-undistorted`
- 已确认去畸变后的 `cameras.bin` 变为 `PINHOLE`
- 已基于 undistorted 数据重新发起真实 `Scaffold-GS` baseline 训练，并完整跑完 `30000` step、测试渲染和指标评估
- 当前首轮真实结果已拿到：
  - 测试 `PSNR 16.2589`
  - 测试 `SSIM 0.3200`
  - 测试 `LPIPS 0.5592`
  - 渲染测试 `FPS` 约 `298.15`
  - 结果目录约 `1021 MiB`
- 已完成 `Scaffold-GS` 首轮结果的主观质量复核；当前结论是：工程入口已打通，但 baseline 在主结构稳定性、局部清晰度和整体指标上都明显落后于 `Iteration 001 splatfacto`
- 因此 `Scaffold-GS` 当前应降为“带参数假设的备选路线”，而不是立即接管默认训练主线
- 已为 `scripts/gaussian_ply_tools.py` 增加 `max_scale` 汇总、`filter-cleanup` 与 `sweep-cleanup`
- 已完成首轮定向清理扫描：`z + max_scale` 联合过滤能用 `0.2%-0.5%` 级别的删除比例显著收缩 bbox，但文件体积仍基本停留在 `267 MiB` 量级
- 当前首个更平衡的清理候选是：`outputs/iteration-003/cleanup-scan/zp0.2-sp99.95/splat.ply`
- 已新增 `docs/iterations/iteration-003-octreegs-entry.md`；当前判断已转向：不再继续把 `splatfacto` 当主要优化主线，而是优先推进 `Octree-GS` 的最小入口与参数核查
- 已新增 `docs/iterations/iteration-003-octreegs-parameter-check.md`；当前已确认 `Octree-GS` 的最小单场景 baseline 命令、官方默认参数以及必须复用 undistorted staging 这三个关键前提
- 已在本机完成 `Octree-GS` 源码下载与环境落地准备：源码已解压到 `experiments/octreegs-src-20260325/Octree-GS-main`，并已成功编译 `diff-gaussian-rasterization` 与 `simple-knn`
- 已新增 `scripts/prepare_octreegs_stage.sh` 与 `scripts/run_octreegs_train.sh`，并用若水广场专用 staging 成功发起首轮 `Octree-GS baseline`
- 已完成 `Octree-GS baseline` 真实训练、测试渲染与指标汇总，结果目录为 `experiments/octreegs-src-20260325/Octree-GS-main/outputs/ruoshui/iteration001/baseline/2026-03-25_01:20:00`
- 当前首轮真实结果为：
  - 测试 `PSNR 16.2087`
  - 测试 `SSIM 0.3091`
  - 测试 `LPIPS 0.5587`
  - 测试渲染 `FPS 251.80`
  - 结果目录约 `1.8G`
- 已确认自动收尾阶段在当前环境里会被 `numpy` 移除 `np.int` 卡住；已做最小兼容修补并单独补跑 `render.py + metrics.py`
- 当前判断已更新为：`Octree-GS` 工程入口已打通，但首轮 baseline 质量未超过现有 `splatfacto`，也没有明显优于 `Scaffold-GS`
- 当前最小下一步应改为：先做首轮 `Octree-GS` 渲染结果的主观复核，再决定是小范围参数扫，还是直接转向下一条结构化路线
