# 项目状态快照

最后更新：`2026-04-18`

## 项目背景

`若水广场` 是一个以常州老校区为对象的空中版 `3DGS` 数字纪念项目。

当前确定的第一版方向：

- `Web` 优先
- 桌面端优先
- 纪念展示优先
- 空中版 `3DGS` 优先
- 暂不做完整开放社区、登录与审核体系
- 第一期先以静态展示上线为目标
- 后端、数据库与 `OSS` 保持预留，但不作为第一期阻塞项

## 最新决策（2026-04-17）

- 部署主路径新增迁移目标：从当前 `Vercel` 静态站优先，逐步切到 `Cloudflare` 生态
- 后端目标从“论坛雏形底座”升级为“图文社区最小闭环 + 场景点位联动”
- 已新增规划文档：`docs/project/cloudflare-community-plan.md`

## 最新决策（2026-04-18）

- `forum-api` 当前开始以 `Cloudflare Workers + D1 + R2` 为默认新链路推进，`Node + PostgreSQL` 仅保留为本地 fallback 与旧 contract 对照
- 上传链路的最小实现策略先收口为“Worker 签发短时 ticket，再由 Worker 代理写入 `R2`”，避免第一步就引入额外 `S3 API` 签名复杂度
- 项目新增“开发专业 skill”规范：前端默认收口到 `Vercel React best practices`，Node 默认收口到 `Matteo Collina + Node 官方最佳实践`，Cloudflare 服务默认收口到 `Cloudflare 官方文档`
- 项目进一步新增 `Web3D` 专业 skill，并明确“技能不够用时先更新 skill，再继续开发”
- 项目进一步将 `Web3D viewer/runtime` 与 `SuperSplat 资产编辑` 拆成两条专业 skill，而不是继续混成同一类
- 项目提交节奏进一步明确：默认采用“小步快跑 + 勤快 commit”，避免把过多不相关 changes 或过大改动揉进同一次交付
- 项目协作流进一步明确：新 feature 走独立分支、完成后提 PR、提 PR 前先做总体 review 与验证

## 当前实现情况

当前仓库已从纯文档驱动与资产验证阶段进入首个前端原型阶段，`Web MVP` 已启动，且目标已进一步收敛为“先上线一版静态纪念展示站”。

已完成：

- 项目 `README`、`spec`、`plan`、`tasks` 已收敛
- 已完成原始素材基础盘点
- 已确认文件名不能作为素材主键，必须使用相对路径
- 已生成素材清单与盘点报告
- 已生成 `PoC 001` 样本清单
- 已确认 `PoC 001` 采用“全量分层均匀抽样”而不是连续序列
- 已确定第一条 `3DGS` 可行性验证链路
- 已沉淀项目 skill：项目总控、资产 `PoC`、恢复入口
- 已补仓库级 `cleanup` skill，并把“commit 前同步文档、清理脏信息与死代码、跑最小验证”纳入默认提交流程
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
- 当前 `Web MVP` 已补入一版第三方去噪 `SOG`（`assets/hhuc-edited.sog`），作为“不重训前提下只做交付侧清理”的新对照版本，用于观察噪点收敛、主体边界和天空边缘是否更干净
- 当前默认对比版本已切到 `hhuc-h0-dec75.sog`，作为首个更平衡的 `Web` 候选
- 当前 `Web MVP` 已补上首版学校小地图：以顶视示意方式显示若水广场区域、相机位置、注视点以及朝向 / 视域状态，作为当前漫游理解辅助
- 当前 `Web MVP` 已新增首版场景内三维点位覆盖层：点位由 `React` 覆盖层渲染、位置由 `PlayCanvas` 相机投影驱动，点击后可联动镜头并展开图文卡片；当前仍是只读内容配置版，不涉及用户发布与后台编辑
- 当前已开始补内部三维打点 authoring 工具：方向是先支持点击打点、位置草稿与内容录入，再决定如何接到后续论坛 / 内容服务；这条线仍在继续收口，不算已完成能力
- 已新增仓库级 `pnpm workspace` 底座：当前仓库开始按 `web/ + services/forum-api/ + packages/shared/` 演进，避免为了后端需求推翻现有前端结构
- 已初始化 `services/forum-api`：当前已落地 `Hono` 服务入口、`Drizzle` schema、对象存储 upload ticket 抽象，以及面向论坛 / 点位 / 媒体的最小 API 路由
- 已初始化 `packages/shared`：当前已补论坛帖子、点位、媒体、上传 ticket 的 `zod schema` 与共享类型，作为前后端 contract 起点
- 已将后端进一步推进到首个可用阶段：当前已接入 `Drizzle + postgres` 数据访问层、生成首个 migration，并落地 `scene bootstrap / scene upsert / post create / pin create` 四个接口
- 已完成 `forum-api` 的首轮运行时解耦：当前 `Hono` app 已改为依赖注入结构，可分别挂载 `Node/PostgreSQL` 与 `Cloudflare Workers/D1`
- 已新增 `Cloudflare Workers` 入口、`wrangler.toml`、本地 `.dev.vars` 模板与首个 `D1` migration，当前默认开发入口已切到 `wrangler dev --local`
- 已新增 `D1` 版 forum repository，并保留旧的 `PostgreSQL` repository 作为本地 fallback 与迁移对照
- 已将上传 ticket contract 扩展到 `r2`，并落地 `Worker -> R2` 的最小直传代理接口：`PUT /api/storage/objects/:objectKey`
- 已创建 `Cloudflare Pages` 项目 `ruoshui-web`，当前生产静态站入口已切到 `https://ruoshui-web.pages.dev`
- 已把生产主模型 `hhuc-original.sog` 外置到 `R2` 公网地址：`https://pub-5fbf37dd49b94b859c13e343effd0430.r2.dev/models/hhuc-original.sog`，用于绕开 `Pages` 单文件 `25 MiB` 限制
- 已给 `web/` 补上 `build:pages` 与 `prepare-cloudflare-pages.mjs`：当前 `Pages` 构建会重写 `content/mvp.json` 中的生产主模型地址，并从 `dist` 中移除超限模型文件
- 已给 `web/` 补上 `deploy-cloudflare-pages.mjs`：当前 `Cloudflare Pages` 生产部署可在本地完成“静态资源上传 + Pages Functions bundle 上传”，不再依赖 `wrangler pages deploy` 的网络握手稳定性
- 已给 `Cloudflare Pages` 补上 `/api/*` Functions 代理，当前 `ruoshui-web.pages.dev` 已不只是静态壳子，而是能从同域名入口转发到 `forum-api`
- 已把生产主模型入口进一步收口到同源 `Pages Functions` 代理 `/edge-models/hhuc-original.sog`，避免前端运行时继续依赖 `r2.dev` 跨域读取
- 已把 `forum-api` 的线上 `Worker settings` 切到新的 Cloudflare 主路径：`CORS_ORIGIN=https://ruoshui-web.pages.dev`，`MEDIA_PUBLIC_BASE_URL=https://pub-5fbf37dd49b94b859c13e343effd0430.r2.dev`
- 已新增三类仓库内专业 skill：`ruoshui-react-vercel`、`ruoshui-node-mcollina`、`ruoshui-cloudflare-workers`
- 已新增第四类仓库内专业 skill：`ruoshui-web-3d`
- 已新增第五类仓库内专业 skill：`ruoshui-supersplat`
- 已新增项目级 skill 映射规范：`docs/project/development-skills.md`
- 已新增项目级工程记忆：`docs/project/engineering-memory.md`
- 已把“按改动域必须带对应专业 skill”写入 `AGENTS.md`
- 已把“命中专业域但 skill 缺失或覆盖不够时，先补/更新 skill 再继续实现”写入项目规范
- 已把“新踩坑先写工程记忆，再按稳定专业域回流 skill”写入项目规范与相关 skill
- 已把“小步快跑、勤快提交、避免大杂烩 diff”写入仓库级规则
- 已把“新 feature 新分支、完成后提 PR、提 PR 前先做总体 review 和验证”写入仓库级规则

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
- 在现有 `forum-api` 的 `Workers + D1 + R2` 骨架之上，继续补图文社区最小闭环：帖子列表、详情、多图发布与点位双向查询

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
- 当前论坛底座的技术选择也已落地：先用 `Hono + Drizzle + PostgreSQL` 建最小内容服务，再通过对象存储抽象去接后续真实 `OSS`
- 当前论坛底座的更具体状态也已明确：服务本身可以启动并通过 health / upload 冒烟，但数据库仍需本机或线上 `PostgreSQL` 实例后才能完成真实写入联调
- 当前部署与基础设施方向也已收口为：若追求最低成本，优先考虑静态站点 + 最小计算资源，而不是把托管数据库作为首期默认配置
- 已完成首轮 `Vercel` 生产部署验证，当前静态站线上构建已能稳定走“只带 `hhuc-original.sog`”这条生产打包路径
- 已把静态站生产打包规则进一步收口：生产部署只携带 `web/public/models/hhuc-original.sog`，其余 `SOG` 派生版本与 `LOD` 资源只在本地开发或非生产构建中暴露
- 已把 `web/` 构建脚本进一步收口为同一套代码下的 profile 切换：默认 `pnpm build` 输出单模型生产包；只有显式 `pnpm build:compare` 才会把派生 `SOG` 与 `LOD` 资源打进构建产物
- 已确认此前 `Vercel` 上传接近 `200 MiB` 的主因不是前端代码，而是把原始版、派生版与整包 `LOD` 资源一起打进了生产构建
- 已完成首轮相机交互手感收口：当前 orbit 控制已改为更偏“地图式”的空中浏览，旋转按视口归一、平移固定在水平面、滚轮缩放做了归一化与限幅
- 已将场景外围环境切到真实天空层方案：当前改为在 `PlayCanvas` 运行时内加载 `Poly Haven` 的 `CC0` 天空资源作为 skydome，而不再用纯 `CSS` 背景图兜底；同时保留原先更暖的加载层氛围与场景轻微暖调
- 已补上首个 `WebGPU` 尝试链路，并已新增 `Auto / WebGPU / WebGL2` 手动切换；当前实际验证结果已进一步收口：天空环境在 `WebGL2` 下正常、在当前 `WebGPU` 路径下不可见，因此默认后端现已回退为 `WebGL2`，`WebGPU` 暂时只保留为实验开关
- 已确认“运行时俯视捕获 → 自动描边生成小地图”这条链路在当前 `PlayCanvas + SOG` 方案下不稳定，现已撤回；当前小地图重新收口为“稳定的交互覆盖层 + 预留静态底图资产入口”，后续改为接入人工确认过的独立底图资源
- 已放开渲染清晰度上限到当前设备原生像素比，且清晰度滑块已改为 `1%` 精度，避免在非整档 `DPR` 设备上超过或达不到原生上限
- 已确认首轮后处理抗锯齿链路会污染当前渲染稳定性：现阶段已临时下线 `FXAA/TAA` 开关，优先保证 `WebGPU/WebGL2` 主渲染链稳定；后续若重启这条线，应从更底层、真正稳定的 `WebGPU` 方案重新验证，而不是继续在现有补丁链上叠加
- 已定位最近一轮“画面突然马赛克、拖动清晰度滑块后恢复”的真实根因：不是抗锯齿本身，而是 `render scale` 初始化阶段把 `devicePixelRatio` 的倍率值误当成百分比参与 clamp，导致运行时可能以极低像素比启动；当前已修正初始化换算，并在页面恢复可见性时补做一次 canvas 分辨率重同步
- 已开始做一期上线收口：正式界面默认隐藏轨迹 benchmark / 打点 authoring / 图形后端切换等实验入口，仅在开发环境继续保留，避免纪念展示页暴露过多工具型控件
- 已补首轮移动端模式收口：当前小屏默认改为浮动入口 + 底部抽屉控制，并已补上单指旋转 / 双指平移 / 双指缩放的触控相机
- 已开始把通用交互骨架从纯手写实现迁到 `Radix/shadcn` 风格原语：当前已接入 `Button / Accordion / Sheet` 基础件，并优先替换移动端控制抽屉与 inspector 折叠区
- 已补项目级 `design.md`，并按它把移动端壳层继续收口为“左上纪念信息 + 右上小地图 + 底部控制坞 + 带摘要的控制抽屉”，不再只是桌面侧栏的缩小版
- 已补开发态视角采集工具：当前可自动扫场景并导出截图、相机参数与小地图提示信息，用于反推轨道设计与地图边界
- 已定位视角采集导出的黑图问题：根因是直接读取运行时 canvas 不稳定；当前已改为开发态开启 capture-friendly buffer，并在采集侧增加位图快照、黑帧检测与自动重试
- 已确认修复后的视角采集结果可直接用于视觉分析：最新一轮 sweep 已能导出真实场景截图，不再是重复黑帧；当前对场景结构的理解已从纯坐标推断升级为“截图 + 相机参数”联合判断
- 已基于真实 sweep 截图重设计首轮导览镜头：当前预设镜头不再只是技术压测位姿，而是优先服务“好看、好懂、能导览”的展示体验
- 已基于真实 sweep 截图重画首版静态小地图底图：当前小地图不再是抽象椭圆示意，而是按校园主体、道路、运动区和中心绿地关系手工收敛出的更贴近场景结构的顶视图
- 已把右上角小地图重新收口为“真实顶视图 + 相机覆盖层”的正式展示方案，并恢复开发态对齐面板，便于继续微调旋转、缩放和偏移参数
- 已完成一轮 UI 收口：当前左侧标题区、模型版本 / 导览镜头面板与右上角小地图重新统一到同一套排版与质感基线上，正式界面继续保留克制的信息密度
- 已补 `Mobile Safari` 视口问题交接文档：当前已把安全区填充问题的尝试路径、关键调试值、无效方向和下一步建议沉淀到 `docs/project/mobile-safari-viewport-handoff.md`
- 已启动前端样式系统重构：当前不再把全局 `CSS` 文件作为默认新增样式入口，而是开始收口为“`Tailwind v4 @theme` token + `TS/cva` primitive + 最小 globals”的结构，并已补文档 `docs/project/web-style-system.md`
- 已完成这轮前端样式系统重构收口：`web/src/globals.css` 已从 `1400+` 行 legacy selector 收缩为只保留 theme token、viewport 变量、reset 与 keyframes；组件视觉已迁到 `web/src/styles/system.ts` 和各 `TSX` 文件内组合的 `Tailwind` 类

## 当前一期上线缺口

- 需要继续收敛 UI 文案与信息密度，强化纪念感并去掉剩余工具型描述
- 需要继续把小地图、天空环境与加载体验做最后一轮稳定性检查
- 需要继续解决 `Mobile Safari` 上场景未真正填满上巴 / 下巴区域的问题

## 当前优先级判断

- 最高优先级不是后端，而是把现有 `PlayCanvas/SOG` 展示链收敛成可上线版本
- 第一阶段完成后，再继续接论坛、数据库、对象存储与点位内容生产链
