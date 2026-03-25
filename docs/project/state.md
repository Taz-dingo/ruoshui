# 项目状态快照

最后更新：`2026-03-25`

## 项目背景

`若水广场` 是一个以常州老校区为对象的空中版 `3DGS` 数字纪念项目。

当前确定的第一版方向：

- `Web` 优先
- 桌面端优先
- 纪念展示优先
- 空中版 `3DGS` 优先
- 暂不做登录、社区、数据库、小程序

## 当前实现情况

当前仓库仍处于文档驱动和资产验证阶段，尚未开始前端原型开发。

已完成：

- 项目 `README`、`spec`、`plan`、`tasks` 已收敛
- 已完成原始素材基础盘点
- 已确认文件名不能作为素材主键，必须使用相对路径
- 已生成素材清单与盘点报告
- 已生成 `PoC 001` 样本清单
- 已确认 `PoC 001` 采用“全量分层均匀抽样”而不是连续序列
- 已确定第一条 `3DGS` 可行性验证链路
- 已沉淀项目 skill：项目总控、资产 `PoC`、恢复入口
- 已完成 `docs` 目录归类，拆分为 `project` 与 `assets`
- 已建立 `Iteration 001` 的实验准备记录
- 已实例化 `Iteration 001` 的真实实验记录文件
- 已补齐 `Iteration 001` 的执行清单与 staging 方案
- 已补齐 `PoC` staging 物化脚本与映射方案
- 已在本机验证 `PoC 001` staging 物化命令可成功生成 `180` 个唯一命名输入
- 已为 `Iteration 001` 建立独立 `Python 3.11` 虚拟环境 `./.venv-iteration001`
- 已安装 `COLMAP` 与 `Nerfstudio` CLI
- 已修复 `numpy` / `opencv` ABI 冲突
- 已为 `COLMAP 4.0.1` 增加兼容 wrapper：`scripts/colmap_compat.sh`
- 已完成 `Iteration 001` 首轮 `ns-process-data`，`179 / 180` 张图成功恢复位姿，并产出 `transforms.json`
- 已在 `NVIDIA RTX 5090` 机器上成功启动 `Iteration 001` 首轮 `splatfacto` 训练
- 已定位并修复 `gsplat` 在 CUDA 机器上的真实阻塞：默认 shell 未暴露 `nvcc` 与 `ninja` 到 `PATH`
- 已生成首个 CUDA 训练 checkpoint：`step-000002000.ckpt`
- 已完成 `Iteration 001` 首轮 `splatfacto` 训练，并生成最终 checkpoint：`step-000029999.ckpt`
- 已确认最终 checkpoint `step-000029999.ckpt` 文件大小约 `3.2 GB`
- 已完成 `Iteration 001` 首轮 headless 评估，并产出 `metrics.json`、`17` 张 `eval` 渲染图与 `interpolate.mp4`
- 已确认 `nerfstudio 1.1.5` 在 `torch 2.10.0+cu128` 下做 `ns-eval` 时，需要显式导出 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`
- 已确认当前 `NVIDIA` 机器 shell 中没有系统级 `ffmpeg`；插值视频通过 Nerfstudio 导出帧序列后再用 `OpenCV` 封装生成
- 已得到首轮质量结论：校园主结构可辨识，但 `floaters` 与边缘拉花仍明显，暂不进入 `Web` 原型阶段
- 已确认当前 Nerfstudio 数据链路支持在 `transforms.json` 的每帧加入 `mask_path`；若边缘大量落在校外区域，下一轮可优先用 per-image campus mask 降低无关边缘干扰
- 已明确 `PoC 001` 当前子集已经满足“效果验证是否达到主观要求”的目标，不再把“继续挑更好子集”作为下一阶段主线
- 已完成 `Iteration 002` 首轮交付体积基线导出，并产出默认 `sh_coeffs` 版 `splat.ply`
- 已完成 `Iteration 002` 的 `rgb` 颜色模式对照导出
- 已确认 `ns-export` 在当前 `torch 2.10.0+cu128` / `nerfstudio 1.1.5` 环境下，同样需要显式导出 `TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1`
- 已得到首轮真实交付体积基线：默认 `sh_coeffs` 导出约 `1.10 GiB`，`rgb` 导出约 `267 MiB`
- 已完成 `rgb` 导出的首轮传输压缩测量：`gzip -9` 后约 `206.61 MiB`，`zstd -19` 后约 `201.41 MiB`
- 已完成首轮 viewer 兼容性核查：PlayCanvas `splat-transform` 虽声明支持 `.ply`，但对当前 Nerfstudio 导出的 `export-rgb/splat.ply` 实测报 `Unsupported data`
- 已确认 `export-rgb/splat.ply` 当前是 Nerfstudio 风格高斯 `PLY schema`：`xyz + rgb + opacity + scale + quaternion`
- 已确认 `GaussianSplats3D` 官方文档声明支持直接加载 `.ply / .splat / .ksplat`，并建议将 `.ply` 转成 `.ksplat` 以获得更快加载
- 已为 `GaussianSplats3D` 增加最小本地试页：`experiments/iteration-002-gaussiansplats3d/`
- 已在本机验证试页与 `rgb PLY` 资产均可通过同源静态服务访问
- 已确认当前原始 `rgb PLY` 在浏览器里可流畅交互，但底部存在大量噪声高斯，整体体积范围明显大于有效区域
- 已新增 `PLY` 空间分析与裁切脚本：`scripts/gaussian_ply_tools.py`
- 已产出两版裁切候选：`crop-zmin-p005` 与 `crop-p05-p995`
- 已将 `crop-p05-p995 + 14x` 确认为当前默认预览组合
- 已创建 `Iteration 003`，将下一轮工作正式拆为两条主线：算法路线筛选，以及现有模型的定向清理与复训候选
- 已新增 `Iteration 003` 算法筛选记录，当前初步优先级为：大场景结构化 `GS` 与压缩型 `GS` 优先，`2DGS / Mip-Splatting` 作为几何与伪影优化备选
- 已将 `Scaffold-GS` 源码包解压到干净目录：`experiments/scaffoldgs-src-20260324/Scaffold-GS-main`
- 已确认当前机器的 `CUDA 12.8` 工具链可见于 `/usr/local/cuda/bin/nvcc`，但默认 shell 尚未将其加入 `PATH`
- 已确认当前系统 shell 中暂无 `ninja`
- 已确认当前在线创建官方 `Scaffold-GS` `conda` 环境时，`conda 24.4.0` 会在拉取频道 `repodata` 时遇到超时与空响应解析失败；因此当前真实阻塞已从“训练入口脚本”转为“运行环境未落地”
- 已为 `Scaffold-GS` 训练入口补上环境前置检查：`scripts/run_scaffoldgs_train.sh` 现已支持 `--conda-prefix`、`--cuda-bin`，并会在 `nvcc / ninja` 缺失时给出明确报错
- 已验证 `./.venv-iteration001` 可作为当前 `Scaffold-GS` 的替代运行环境：已成功补装 `colorama / einops / lpips / laspy / torch-scatter`，并编译通过 `diff_gaussian_rasterization` 与 `simple_knn`
- 已对 `Scaffold-GS` 源码中的 `submodules/simple-knn/simple_knn.cu` 做最小兼容修补：补入 `<cfloat>` 以适配当前 `CUDA 12.8` 编译
- 已成功启动一次真实 `Scaffold-GS` baseline 训练，确认当前 Python 环境、CUDA 扩展和 staging 链路均已打通
- 已确认原始 `outputs/iteration-001/processed/colmap/sparse/0/cameras.bin` 当前为 `OPENCV` 相机模型，而 `Scaffold-GS` 读取器只接受 `PINHOLE / SIMPLE_PINHOLE`（以及代码中的 `SIMPLE_RADIAL`）
- 已在本机通过 `apt` 安装 `COLMAP 3.7`
- 已完成 `COLMAP image_undistorter`，产出去畸变后的场景目录：`outputs/iteration-003/scaffoldgs-undistorted`
- 已确认去畸变后的 `outputs/iteration-003/scaffoldgs-undistorted/sparse/cameras.bin` 变为 `PINHOLE`
- 已基于 undistorted 结果新增 staging：`outputs/iteration-003/scaffoldgs-stage-undistorted/ruoshui/iteration001`
- 已成功以该 undistorted staging 重启真实 `Scaffold-GS` baseline 训练，并完整跑完 `30000` step、测试渲染和指标评估
- 当前这轮真实结果的关键事实：
  - 输入相机 `179`
  - 初始化点数约 `56079`
  - 训练速度大致稳定在 `28-31 it/s`
  - 峰值观察显存约 `6.7 GiB / 32.6 GiB`
  - 完整训练耗时约 `16` 分钟 `19` 秒
  - 测试渲染 `FPS` 约 `298.15`
  - 测试指标：`PSNR 16.2589 / SSIM 0.3200 / LPIPS 0.5592`
  - 输出目录：`experiments/scaffoldgs-src-20260324/Scaffold-GS-main/outputs/ruoshui/iteration001/baseline/2026-03-24_22:55:43`
  - 结果目录总大小约 `1021 MiB`
- 已完成首轮 `Scaffold-GS` 主观复核；当前判断是：这条链路已打通，但首轮 baseline 在主结构稳定性、局部清晰度与整体指标上都明显落后于 `Iteration 001 splatfacto`，暂不升级为默认主线
- 已完成 `Iteration 003` 的首轮定向清理扫描：当前已确认极端大尺度高斯几乎完全落在低 `z` 尾部，`z + max_scale` 联合过滤可用极小删除比例显著收缩场景 bbox，但对字节体积帮助很有限
- 已确认当前不再继续把 `splatfacto` 当作主要优化主线；下一条更合理的真实实验已转向 `Octree-GS` 的最小入口核查
- 已完成 `Octree-GS` 单场景参数核查：当前已确认其数据入口与 `Scaffold-GS` 一致，且读取 `COLMAP` 时同样只接受 undistorted 相机模型；若继续推进，应直接复用现有 undistorted staging
- 已完成 `Octree-GS` 的首轮源码与环境落地准备：源码已解压到 `experiments/octreegs-src-20260325/Octree-GS-main`，并已用 `./.venv-iteration001 + /usr/local/cuda/bin` 成功编译 `diff-gaussian-rasterization` 与 `simple-knn`，且通过了最小 import 验证
- 已新增 `scripts/prepare_octreegs_stage.sh` 与 `scripts/run_octreegs_train.sh`，并完成若水广场专用 undistorted staging 映射
- 已完成首轮 `Octree-GS baseline` 真实训练，输出目录为 `experiments/octreegs-src-20260325/Octree-GS-main/outputs/ruoshui/iteration001/baseline/2026-03-25_01:20:00`
- 当前这轮真实结果的关键事实：
  - 输入相机 `179`
  - `LOD Levels` 为 `4`
  - `Initial Voxel Number` 为 `80753`
  - 主循环训练耗时约 `26` 分 `19` 秒
  - 测试渲染 `FPS` 约 `251.80`
  - 测试指标：`PSNR 16.2087 / SSIM 0.3091 / LPIPS 0.5587`
  - 结果目录总大小约 `1.8G`
- 已确认这轮训练不是卡在主循环，而是官方自动渲染阶段被 `numpy` 移除 `np.int` 的兼容问题中断；当前已做最小修补并补跑 `render.py + metrics.py`
- 已得到新的路线判断：`Octree-GS` 的工程链路已经打通，但首轮 baseline 质量没有超过当前 `splatfacto`，也没有明确优于 `Scaffold-GS`
- 因此 `Octree-GS` 当前应视为“已证明可跑通的结构化 `LOD` 备选路线”，而不是已经足够接管默认主线的方案
- 已完成 `Octree-GS` 首轮主观复核：当前没有观察到“指标差但视觉更适合桌面 `Web` 漫游”的隐藏优势；它与 `Scaffold-GS` 基本同档，仍明显落后于现有 `splatfacto` 的较好视角质量
- 当前对 `Octree-GS` 的判断已进一步收紧：短期内不再继续围绕官方默认参数做连续深挖，应直接转向下一条更有信息增量的结构化路线
- 已补做 `Octree-GS` 的体积与 Web 链路核查：其最终 `point_cloud.ply` 单文件约 `256 MiB`，与现有 `splatfacto rgb ply` 的 `268 MiB` 接近；但其 `PLY schema` 依赖 `f_anchor_feat_* / f_offset_*` 与额外 `MLP` 权重，不是当前 `GaussianSplats3D` 原型链可直接复用的单文件资产
- 已新增 `docs/iterations/iteration-003-citygaussian-entry.md`；当前路线判断已继续收敛：在 `Scaffold-GS` 与 `Octree-GS` 都已完成真实判定后，`CityGaussian` 是下一条最值得继续做入口核查的大场景结构化路线

## 当前已知素材状态

- 原始素材目录：`assets/raw`
- 总图片数：`1637`
- 总体积：约 `10.02 GB`
- 分辨率：统一为 `4000x3000`
- 目录：`101MEDIA` 与 `102MEDIA`
- 跨目录重名文件组：`638`

## 当前 top task

当前最重要的任务是：

- 基于已完成的路线筛选与 `Scaffold-GS` 基线复核，优先设计当前 `splatfacto` 结果的首个定向清理/复训实验，再决定是否有必要带着明确假设回头调 `Scaffold-GS`

当前已确认的最近阻塞：

- 原始硬件阻塞与 headless 评估阻塞都已解除
- 当前主要阻塞已从“素材能不能成”切到“当前结果怎么交付”：训练 checkpoint `3.2 GB`、训练目录 `3.8 GB`，还不是 `Web` 可直接承受的资产形态
- 当前首轮导出基线已经拿到，但默认 `sh_coeffs` 导出约 `1.10 GiB`，即使切到 `rgb` 导出也仍有约 `267 MiB`，离 `Web MVP` 直接加载仍有距离
- 当前还已确认：对 `rgb` 二进制 `PLY` 做传输压缩，`gzip` / `zstd` 只能再压到约 `200 MiB` 出头，仍不足以把问题变成“可直接上线”
- 当前 viewer 方向也已初步收敛：PlayCanvas 当前不应被假设为“直接吃 Nerfstudio `PLY`”，短期更现实的原型候选是 `GaussianSplats3D` 一类的 `PLY / ksplat` 路线
- 现有结果的主观质量已经达到可接受范围，因此下一步不是继续证明“能不能重建”，而是证明“能不能被部署、加载和体验”
- 当前下一步已从“文档层兼容性核查”推进到“最小浏览器入口已准备好，等待真实加载观察”
- 当前浏览器观察与空间分析已经进一步收敛出优先方向：应优先处理底部大尺度离群高斯，而不是先追求格式转换
- 当前 viewer 试验已经收敛到够用状态，下一 session 的重点不再是 viewer 小调，而是 `GS` 模型本身的优化
- 当前新增的关键判断是：`GS` 模型优化不应只理解为“裁切 / mask / 复训”，还必须前置评估 `2DGS`、大场景 `GS` 与压缩型 `GS` 路线
- 关于“是否直接全量训练”的判断也已经明确：当前不建议从 `180` 张直接跳到 `1600+` 张全量训练

这一步的目标不是前端展示，而是验证：

- 当前场景导出后的真实可交付体积已经初步确认，并验证了颜色表示简化具备明显减重空间
- 是否能通过裁切、剪枝、压缩或更轻量表示把 `rgb` 级别资产继续降到 `Web MVP` 可接受范围
- 渐进式加载应通过什么方式落地，例如双阶段加载、预览资产或多层级场景
- 是否需要保留当前 `3DGS` 路线，还是转向其他高斯相关表示
- 哪类 `GS` 算法更适合当前问题形态：几何更准的 `2DGS`、更适合大场景的结构化 `GS`，还是更适合交付端的压缩型 `GS`

## 当前关键文件

优先读取：

- `README.md`
- `docs/project/spec.md`
- `docs/project/plan.md`
- `docs/project/tasks.md`
- `docs/project/state.md`
- `docs/iterations/iteration-002.md`

资产验证相关：

- `docs/assets/asset-inventory.md`
- `docs/assets/poc-001.md`
- `docs/assets/3dgs-experiment-path.md`
- `docs/assets/asset-validation-template.md`
- `docs/assets/raw-asset-policy.md`
- `data/poc-001-files.txt`
- `scripts/analyze_assets.py`
- `scripts/select_poc_subset.py`

## 最近关键决策

- 原始素材区当前不做重命名，保留 `assets/raw` 作为只读原始归档
- 第一版不做开放发帖社区
- 第一版不退回 `mesh` 作为主方案
- `PoC 001` 不采用连续单向照片，而采用全量分层均匀抽样
- 需要小步迭代，并在每个 coherent step 后及时 commit
- 在 `NVIDIA` 机器上，`gsplat` 的 JIT 编译依赖 `nvcc` 与 `ninja` 都能被当前 shell 直接发现
- `Iteration 001` 首轮结果已经达到“可判断”但未达到“可展示”的质量
- `PoC 001` 当前子集已经足够支撑效果验证，不再优先继续挑更好子集
- 下一步不再把素材范围和子集优化当主线，而是转到场景交付与体积优化调研
- 若边缘主要对应校外区域，`mask` 仍然是可用手段，但属于“交付优化候选项”，不是当前唯一主线
- `Web` 交付判断不能再只看 checkpoint；必须同时观察默认 `sh_coeffs` 与 `rgb` 两种导出体积
- 仅切换到 `rgb` 颜色表示即可把当前导出体积降低约 `76%`，但仍不足以直接作为 `Web MVP` 的完整首屏资产
- 对当前二进制 `PLY` 而言，传输压缩只能提供中等幅度帮助；真正的主线仍是减少高斯数量、缩小场景范围或引入双阶段加载
- “viewer 兼容性”不能只看文档支持的扩展名；同为 `.ply` 也可能因为高斯字段 schema 不同而无法直接互通
- 当前最值得优先验证的原型路线是 `GaussianSplats3D` 的原始 `PLY` / `ksplat` 加载，再决定是否还要为 PlayCanvas 额外做格式归一化
- 当前 `rgb PLY` 的 bbox 主要被极少数大尺度离群高斯拖大；问题的主因更像“少量巨大脏高斯”，而不是“海量普通噪声点”
- 仅裁掉 `z` 轴最低 `0.5%` 的高斯，就能去掉几乎全部底部尺度体积代理；这应成为下一轮减重与清理实验的第一优先级
- 下一 session 应优先先做算法路线筛选，再从 `GS` 模型侧解决这些问题，例如更精确的校园区域裁切、per-image campus mask、五向/连续段重组或更小规模复训实验
- 算法筛选至少覆盖三类方向：`2DGS / Mip-Splatting` 一类的几何与伪影优化路线、`Scaffold-GS / Octree-GS / CityGaussian / VastGaussian` 一类的大场景结构化路线、以及 `LightGaussian` 一类的压缩交付路线
- 当前算法筛选已收敛出三个紧接着要回答的问题：`LightGaussian` 能否衔接现有结果、哪条大场景结构化 `GS` 路线对自定义 `COLMAP` 场景接入门槛最低、`2DGS / Mip-Splatting` 是否更适合作为第二阶段质量增强分支
- 当前接入核查已经得到新的优先级结论：在“允许重训”的前提下，结构化 `GS` 的最小入口优先是 `Scaffold-GS`，其次是 `Octree-GS`，`CityGaussian` 作为更重的后续主线候选
- 本地 checkpoint 与导出 `PLY` 的进一步核查已坐实：当前 `splatfacto` 结果在参数语义上接近 `3D-GS`，但封装结构属于 `nerfstudio` 生态；因此 `LightGaussian` 仍值得保留，但应后移为训练路线收敛后的交付压缩候选，而不是当前第一条真实实验主线
- 当前对 `Scaffold-GS` 的最小入口核查已经完成：若水广场现有 `outputs/iteration-001/processed/images` 与 `outputs/iteration-001/processed/colmap/sparse/0` 已满足其自定义场景核心数据要求；当前主要缺口不是数据本身，而是 staging 目录层级与首轮训练命令落地
- 当前 `Scaffold-GS` 的 staging 与训练触发脚本都已落地，并已完成真实 baseline 训练；后续不再需要重复验证“能否启动”，而是只需判断“是否值得继续投入”
- 已在本机下载完整 `Scaffold-GS` 源码压缩包：`/tmp/scaffoldgs-download/scaffoldgs.zip`，并验证压缩包完整；当前也已解压出干净源码目录并完成一轮真实训练
- 当前工作树还存在两处未完成尝试留下的本地目录：`.venv-scaffoldgs/` 与 `experiments/Scaffold-GS/`；当前应优先围绕干净源码目录 `experiments/scaffoldgs-src-20260324/Scaffold-GS-main` 继续，而不是复用旧尝试目录
- 当前已经不需要再把“如何创建官方 `conda` 环境”或“如何把 `OPENCV` 相机转成 `PINHOLE`”当成主阻塞；这条链路的工程入口与首轮基线都已拿到，下一步应转向“是否值得继续投入”和“若不值得，主线该回到哪里”
- 当前 `Scaffold-GS` 首轮结果复核已经完成；新的判断是：工程入口已经打通，但 baseline 质量明显回退，因此短期内不应盲目继续把主要时间投入在 `Scaffold-GS` 连续重跑上
- 对当前项目更合理的主线是：回到现有 `splatfacto` 结果，优先验证更精确的空间裁切、per-image campus mask、素材重组或小规模复训，而把 `Scaffold-GS` 保留为带参数假设的备选路线
- 当前首轮定向清理扫描已经给出新的更细判断：导出后联合清理可以作为默认预览/清理前置步骤，但不能替代后续 `mask`、素材重组或复训主线
- 当前主线判断已进一步收敛：`splatfacto` 保留为现有最好基线，但不再作为继续深挖的首选；更合理的下一步是转向 `Octree-GS` 这类真正引入 `LOD` 与多尺度结构的路线
- 当前 `Octree-GS` 的最小单场景 baseline 也已经足够清晰：可先按官方 `single_train.sh` 默认参数起步，并复用现有 undistorted `images + sparse/0` staging；当前真正未解的主要是环境落地，而不是数据入口
- 当前 `Octree-GS` 已经完成从环境落地、真实训练到主观复核的完整判断；当前更小的下一步不再是继续复核它，而是围绕 `CityGaussian` 做分支选择与最小入口核查
- 未经整理直接全量训练不是当前推荐下一步；如果沿用当前 `COLMAP exhaustive matching` 思路，`1600-1637` 张会把图像对数量抬到约 `1279200-1339066` 对，约为当前 `180` 张实验的 `79x-83x`
- 若要扩量，应优先走结构化扩容，而不是一次性全量灌入：先做 `300-600` 张级别的分组、连续段或加 `mask` 实验，再决定是否值得上更大规模

## 推荐恢复动作

当新线程里用户只说“继续”时，优先执行：

1. 阅读本文件与 `docs/project/tasks.md`
2. 检查 `git status --short` 与最近 `5` 个 commit
3. 用简短语言总结背景、现状、当前任务、下一步
4. 建立一个短计划
5. 优先确认算法路线是否需要切换，再开始当前最小下一步
