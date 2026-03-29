# 项目状态快照

最后更新：`2026-03-30`

## 项目背景

`若水广场` 是一个以常州老校区为对象的空中版 `3DGS` 数字纪念项目。

当前确定的第一版方向：

- `Web` 优先
- 桌面端优先
- 纪念展示优先
- 空中版 `3DGS` 优先
- 暂不做完整开放社区、登录与审核体系
- 开始为论坛雏形、数据库与 `OSS` 预留最小后端能力

## 当前实现情况

当前仓库已从纯文档驱动与资产验证阶段进入首个前端原型阶段，`Web MVP` 已启动。

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
- 已补做 `Octree-GS` 的 `LOD` 价值验证：`LOD0` 与 `LOD1` 确实构成真实层级裁剪，但当前 `LOD0` 在代表视角里已明显丢失主结构稳定性，而 `LOD1` 又基本接近完整结果；因此现阶段还不能把它视为“已拿到可直接用于 Web 粗预览层”的优势
- 已完成一轮 `Octree-GS` 最小 `LOD` 参数短跑验证：`base_layer=-1 / levels=5 / init_level=1 / visible_threshold=-1 / iterations=10000` 这组参数已把最终有效层级从此前的 `2` 档拉到 `3` 档；其中 `LOD1` 已能保住主要结构，说明 `Octree-GS` 的 `LOD` 价值并非不可调，只是当前默认 baseline 没把它拉出来
- 已新增 `docs/iterations/iteration-003-citygaussian-entry.md`；当前路线判断已继续收敛：在 `Scaffold-GS` 与 `Octree-GS` 都已完成真实判定后，`CityGaussian` 是下一条最值得继续做入口核查的大场景结构化路线
- 已结合用户最新主观判断完成主线切换：`Scaffold-GS` 与 `Octree-GS` 当前都不再继续投入；下一 session 的默认 baseline 入口直接改为 `CityGaussian`
- 已通过远端分支核查确认 `CityGaussian` 官方真实分支名为 `V1-original`，不是此前文档里的 `V1-Original`
- 已新增 `scripts/prepare_citygaussian_stage.sh`，并把若水广场侧最小 `CityGaussian` scene root 固定到 `outputs/iteration-003/citygaussian-stage/ruoshui/iteration001`
- 已结合官方 `main` 文档与若水广场当前 `179` 张 undistorted 资产规模，收敛出新的工程建议：若只追求最小真实入口，下一步应优先从 `CityGaussian` 的 `V1-original` 分支开始，而把 `main` 留给后续 `300-600` 张级别的结构化扩量与完整预处理链验证
- 已新增 `scripts/prepare_citygaussian_v1_stage.sh`，并把若水广场侧最小 `V1-original` scene root 固定到 `outputs/iteration-003/citygaussian-v1-stage/ruoshui/iteration001`
- 已新增 `scripts/run_citygaussian_v1_train.sh`，并把 `V1-original` 的官方执行顺序固定为若水广场可复用的 dry-run 入口
- 已新增 `configs/citygaussian-v1/` 下的两份若水广场专用 `V1-original` yaml 模板，以及 `scripts/install_citygaussian_v1_configs.sh` 安装脚本；当前默认先按 `block_dim=[1,1,1]` 的单块 bootstrap 入口推进
- 已新增 `scripts/fetch_citygaussian_v1_source.sh`，用于把 `CityGaussian V1-original` 源码统一抓取到 `experiments/`，避免后续重复手敲下载命令
- 已对 `CityGaussian V1-original` 做多轮真实源码拉取尝试；当前本机多次得到的归档仍会在 `tar -tzf` 阶段报 `Unexpected EOF in archive`，说明真实阻塞仍是远端下载不稳定，而不是若水广场侧的 staging、dry-run 脚本或 yaml 模板
- 已记录新的交付侧线索：用户在《知天下》站点得到了一份效果很好的 `30 MiB` 级 `.sog` 高斯资产；当前判断是 `.sog` 应视为 `PlayCanvas` 体系的压缩交付格式，值得作为下一轮 Web 交付验证分支单独跟进
- 已确认本地 `assets/hhuc.sog` 可解包为 `meta.json + webp` 纹理包，当前应把它视为直接交付资产，而不是训练输入格式
- 已启动首个正式 `Web MVP` 前端项目：`web/`
- 已选定当前正式 viewer 路线为 `PlayCanvas Engine API + gsplat + SOG` 直加载
- 已通过 `web/vite.config.mjs` 将仓库根目录 `assets/hhuc.sog` 映射为前端运行时 `/models/hhuc.sog`，避免维护重复模型副本
- 已通过 `web/public/content/mvp.json` 固定首版文案、导览镜头与记忆锚点的 `JSON` 结构
- 当前前端原型已具备：全屏场景、加载状态、镜头预设、记忆锚点面板与桌面端浏览交互
- 当前前端样式体系已开始从单体手写 `CSS` 迁移到 `Tailwind CSS`，以降低后续 UI 调整与 AI 协作成本
- 当前 `Web MVP` 的主要交互面板已逐步迁移到 `React + Zustand`，包括版本切换、镜头预设、相机信息、轨迹控制与诊断面板
- 当前前端状态管理边界已进一步纠偏：`Zustand` 只保留共享运行时状态与 `React -> PlayCanvas` 的桥接请求，面板展开这类局部 `UI` 状态回归 `React` 组件内状态
- 已将 `viewer` 相关类型拆分为 `benchmark / runtime / content / ui` 四个域文件，避免继续把全部前端类型堆回单一 `types.ts`
- 已将散落在 `viewer.ts` 内的 `UI store` 写入进一步收口到 `web/src/ui/viewer-ui-sync.ts`，当前 `viewer.ts` 更明确地只承担组合入口与运行时编排
- 已将 `web/src` 顶层继续降噪：当前组合入口收口到 `web/src/app/`，领域类型分别回收到 `content / benchmark / runtime / ui` 目录，旧的根级 `types.ts` 已移除
- 已将 `components` 与 `ui` 继续做第二层分组：当前 viewer 组件统一放到 `web/src/components/viewer/`，`ui` 目录则按 `commands / controllers / state` 分开，减少“同层混放不同抽象层”的噪音
- 已将轨迹播放与基准测试辅助逻辑从 `web/src/viewer.ts` 拆到 `web/src/benchmark/playback.ts`，当前代码重构方向继续收敛为“保留 PlayCanvas 运行时、逐步把 orchestration / UI / benchmark 分层”
- 已完成关于“丝滑渐进加载”的一次更明确判断：当前单文件 `SOG` 链路本质上仍是整包下载后再建资源，不足以复现原版那种连续生长式高斯加载；短期尝试过多阶段轻量 `SOG` 预览链，但主观体感表现为明显闪烁与阶段跳变，因此当前已撤回，重新回到稳定的单次加载；长期若要真正对齐，则需要前缀可渲染的 progressive splat 格式与自定义 loader / resource
- 围绕“真正连续生长式加载”的技术判断现已收口：单文件 `SOG` 不具备我们想要的连续生长式体验；`progressive runtime` 分支虽然验证了替代链路可行，但当前用户已明确不再把“渐进式加载”作为主线目标，因此该分支转入归档状态，不继续抢占主线资源
- 当前主线重新明确为：继续保留 `React + Vite + Zustand + Tailwind + PlayCanvas/SOG`，把后续投入集中到真实产品功能、交互打磨、代码整理和稳定性，而不是继续切换到底层 progressive 资产链
- `SOG -> PLY` 的首个 converter spike 已落地到 `/Users/tazdingo/Dingo Projetcts/ruoshui/web/scripts/sog-to-ply.mjs`，并已成功把 `assets/hhuc.sog` 转出一版完整的 `outputs/iteration-005-progressive-runtime/hhuc-from-sog.ply`；当前默认输出 `SH degree 2`，优先对齐 `GaussianSplats3D` 的可用范围
- 已开出第一版真实 `progressive runtime` spike 页面：`/Users/tazdingo/Dingo Projetcts/ruoshui/web/progressive.html`，当前使用 `GaussianSplats3D progressiveLoad` 直接加载 `/models/hhuc-progressive.ply`，用于主观验证“边下边显示”的体感
- 已把 `PLY -> KSPLAT` 这一段也串起来：新增 `/Users/tazdingo/Dingo Projetcts/ruoshui/web/scripts/ply-to-ksplat.mjs`，并产出 `outputs/iteration-005-progressive-runtime/hhuc-from-sog.ksplat`
- 当前这一轮压缩结果已明确收效：同一模型从 `hhuc-from-sog.ply` 的约 `292 MiB` 进一步压到 `hhuc-from-sog.ksplat` 的约 `120 MiB`；这些产物当前保留为技术调研资产，而不是接下来 `Web MVP` 的默认交付链
- 当前前端技术栈判断已进一步收口：保留 `React + Vite + Zustand + Tailwind + PlayCanvas/SOG` 作为主线；短期只考虑补 `Radix/shadcn` 这类开源原语层和 `Biome` 这类格式检查工具，不切换 `Three.js` 或更重框架
- 当前“极致性能”方向也已补充判断：若后续只考虑最终效果与浏览器内渲染上限，真正值得投入的不是单纯换 `Rust` 或换 `Three.js`，而是优先验证 `WebGPU`、`Worker + OffscreenCanvas`、以及 `Rust/WASM` 在解码/流送/调度热路径上的组合；但这应作为后续性能分支，而不是现在立刻推翻现有运行时
- 已补充一条前端代码风格约定：`web/` 下的 `TS/JS` 模块优先使用文件末尾统一 `export { ... }`，避免在每个函数或常量声明前分散写 `export`
- 已完成首轮 `SOG` 交付侧派生实验，输出 `h0 / opacity01 / dec75 / dec50` 四个轻量版本到 `outputs/iteration-004-sog-opt/`
- 当前 `Web MVP` 已升级为同页多版本对比页，可在原始版与 `4` 个派生版本之间切换主观比较画质与性能
- 当前默认对比版本已切到 `hhuc-h0-dec75.sog`，作为首个更平衡的 `Web` 候选
- 当前 `Web MVP` 已新增首版场景内三维点位覆盖层：点位由 `React` 覆盖层渲染、位置由 `PlayCanvas` 相机投影驱动，点击后可联动镜头并展开图文卡片；当前仍是只读内容配置版，不涉及用户发布与后台编辑
- 当前已开始补内部三维打点 authoring 工具：方向是先支持点击打点、位置草稿与内容录入，再决定如何接到后续论坛 / 内容服务；这条线仍在继续收口，不算已完成能力

## 当前已知素材状态

- 原始素材目录：`assets/raw`
- 总图片数：`1637`
- 总体积：约 `10.02 GB`
- 分辨率：统一为 `4000x3000`
- 目录：`101MEDIA` 与 `102MEDIA`
- 跨目录重名文件组：`638`

## 当前 top task

当前最重要的任务是：

- 保留当前 `CityGaussian V1-original` 训练入口准备成果，但产品主线继续聚焦 `PlayCanvas/SOG` 的 `Web MVP`、三维点位能力，以及后续论坛 / 内容服务底座，不再继续把“渐进式加载”当作当前迭代目标

当前已确认的最近阻塞：

- 原始硬件阻塞与 headless 评估阻塞都已解除
- 当前主要阻塞已从“素材能不能成”切到“当前结果怎么交付”：训练 checkpoint `3.2 GB`、训练目录 `3.8 GB`，还不是 `Web` 可直接承受的资产形态
- 当前首轮导出基线已经拿到，但默认 `sh_coeffs` 导出约 `1.10 GiB`，即使切到 `rgb` 导出也仍有约 `267 MiB`，离 `Web MVP` 直接加载仍有距离
- 当前还已确认：对 `rgb` 二进制 `PLY` 做传输压缩，`gzip` / `zstd` 只能再压到约 `200 MiB` 出头，仍不足以把问题变成“可直接上线”
- 当前 viewer 主线已重新收口：继续以 `PlayCanvas/SOG` 为正式交付链；`GaussianSplats3D progressive` 相关验证保留为归档研究，不作为当前产品分支继续推进
- 现有结果的主观质量已经达到可接受范围，因此下一步不是继续证明“能不能重建”，而是证明“能不能被部署、加载和体验”
- 当前下一步已从“文档层兼容性核查”推进到“最小浏览器入口已准备好，等待真实加载观察”
- 当前浏览器观察与空间分析已经进一步收敛出优先方向：应优先处理底部大尺度离群高斯，而不是先追求格式转换
- 当前 viewer 试验已经收敛到够用状态，下一 session 的重点不再是 viewer 小调，而是 `GS` 模型本身的优化
- 但随着 `Web MVP` 持续扩展，当前新的工程性任务也已变得明确：需要继续把前端运行时、UI 状态、轨迹播放和基准分析拆开，否则后续性能实验与交互调整会越来越难做
- 当前新增的关键判断是：`GS` 模型优化不应只理解为“裁切 / mask / 复训”，还必须前置评估 `2DGS`、大场景 `GS` 与压缩型 `GS` 路线
- 关于“是否直接全量训练”的判断也已经明确：当前不建议从 `180` 张直接跳到 `1600+` 张全量训练
- 当前围绕大场景结构化路线的更小阻塞已收缩为三件事：选 `main` 还是 `V1-original`、补下采样、补深度先验
- 当前这个分支选择已初步收口：若只求最小真实入口，优先 `V1-original`；若进入更大规模结构化扩量，再切 `main`
- 当前围绕 `V1-original` 的最小未解点也已收缩：主要只剩官方 `custom_dataset` 和 `run_citygs.sh` 里的命令细节核对，而不是数据目录重整
- 当前 `custom_dataset` 和 `run_citygs.sh` 的关键路径与执行顺序都已核实；更小的下一步已进一步收缩为：补两份若水广场专用 `yaml`，而不是继续猜目录和主命令
- 上述两份 `yaml` 现已落地；当前更小的下一步已进一步收缩为：把模板安装进真实 `CityGaussian` 仓库并做一次完整 dry-run，必要时再调 `aabb` 和 `block_dim`
- 当前 `CityGaussian V1-original` 真正未过的关卡只剩“拿到完整可解压源码归档”；在这一步恢复前，不值得继续投入更多入口脚本时间
- 当前关于 `.sog` 的最小已知判断是：它更像 `PlayCanvas` 的 `Spatially Ordered Gaussians` 交付格式，而不是通用训练交换格式；因此它回答的是“怎么更轻地交付和加载”，不是“怎么训练”
- 当前关于第三方 `SOG` 的最新判断是：在无法重训时，交付侧派生与同页主观对比已经成为最有效的前端决策工具，下一步应基于 compare 页结果收敛正式默认版本
- 当前关于前端技术栈的最新判断是：现有 `React + Zustand + Tailwind + Vite` 已经足够 AI 友好，真正不够友好的部分主要是我们自己的业务代码仍偏集中；因此下一步优先做模块化与类型化，而不是重新换框架
- 当前关于前端状态方案的最新判断是：不应把 `Zustand` 误用为所有状态的统一容器；应优先用组件本地状态承载局部 `UI`，只有跨层共享、运行时镜像和命令桥接才进入全局 store
- 当前关于性能技术栈的最新判断是：若要继续追求浏览器内 `3DGS/SOG` 上限，应优先按“`PlayCanvas/SOG` 现栈优化 → `WebGPU` 可行性验证 → `Worker/WASM` 热路径迁移 → 必要时再看自研 `WebGPU renderer`”这个顺序推进，而不是先做纯语言层替换
- 当前前端命名约定进一步明确：`React` 组件文件使用 `PascalCase`，其余 `TS` 模块与工具文件统一使用 `kebab-case`；当前目录里看到的不是 `snake_case` 混用，而是按职责区分的两套命名
- 当前产品边界已出现一条新变化：虽然主体验仍是纪念展示，但已开始需要数据库、媒体存储与论坛雏形；后端策略已初步收口为“同仓库 `monorepo` + 独立服务”，而不是把现有前端整体迁到 `Next.js`

这一步的目标不是前端展示，而是验证：

- 当前场景导出后的真实可交付体积已经初步确认，并验证了颜色表示简化具备明显减重空间
- 是否能通过裁切、剪枝、压缩或更轻量表示把 `rgb` 级别资产继续降到 `Web MVP` 可接受范围
- 渐进式加载应通过什么方式落地，例如双阶段加载、预览资产或多层级场景
- 是否需要保留当前 `3DGS` 路线，还是转向其他高斯相关表示
- 哪类 `GS` 算法更适合当前问题形态：几何更准的 `2DGS`、更适合大场景的结构化 `GS`，还是更适合交付端的压缩型 `GS`
- `CityGaussian` 这条更重的 divide-and-conquer 路线，是否真的值得为当前 `180` 张子集或后续 `300-600` 张结构化扩量投入环境与训练成本
- 现有 `.sog` 级别交付资产，是否能绕开当前 `PLY` 体积瓶颈，直接回答若水广场 Web MVP 的加载与体验问题
- 在不重训的前提下，`dec75 / h0 / opacity01 / dec50` 这些派生版本里，哪一版最适合作为若水广场正式 `Web MVP` 默认交付资产

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
- 当前 `Octree-GS` 已经完成从环境落地、真实训练到主观复核与 `LOD` 小调的完整判断；当前更小的下一步不再是继续给它预算，而是围绕 `CityGaussian` 做分支选择与最小入口核查
- 未经整理直接全量训练不是当前推荐下一步；如果沿用当前 `COLMAP exhaustive matching` 思路，`1600-1637` 张会把图像对数量抬到约 `1279200-1339066` 对，约为当前 `180` 张实验的 `79x-83x`
- 若要扩量，应优先走结构化扩容，而不是一次性全量灌入：先做 `300-600` 张级别的分组、连续段或加 `mask` 实验，再决定是否值得上更大规模

## 推荐恢复动作

当新线程里用户只说“继续”时，优先执行：

1. 阅读本文件与 `docs/project/tasks.md`
2. 检查 `git status --short` 与最近 `5` 个 commit
3. 用简短语言总结背景、现状、当前任务、下一步
4. 建立一个短计划
5. 优先确认算法路线是否需要切换，再开始当前最小下一步
