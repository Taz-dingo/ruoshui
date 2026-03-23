# 项目状态快照

最后更新：`2026-03-23`

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

## 当前已知素材状态

- 原始素材目录：`assets/raw`
- 总图片数：`1637`
- 总体积：约 `10.02 GB`
- 分辨率：统一为 `4000x3000`
- 目录：`101MEDIA` 与 `102MEDIA`
- 跨目录重名文件组：`638`

## 当前 top task

当前最重要的任务是：

- 基于当前已可接受的首轮效果，转向场景交付调研：体积优化、渐进式加载和更适合 `Web MVP` 的表示形式选择

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
- 关于“是否直接全量训练”的判断也已经明确：当前不建议从 `180` 张直接跳到 `1600+` 张全量训练

这一步的目标不是前端展示，而是验证：

- 当前场景导出后的真实可交付体积已经初步确认，并验证了颜色表示简化具备明显减重空间
- 是否能通过裁切、剪枝、压缩或更轻量表示把 `rgb` 级别资产继续降到 `Web MVP` 可接受范围
- 渐进式加载应通过什么方式落地，例如双阶段加载、预览资产或多层级场景
- 是否需要保留当前 `3DGS` 路线，还是转向其他高斯相关表示

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
- 下一 session 应优先从 `GS` 模型侧解决这些问题，例如更精确的校园区域裁切、per-image campus mask、五向/连续段重组或更小规模复训实验
- 未经整理直接全量训练不是当前推荐下一步；如果沿用当前 `COLMAP exhaustive matching` 思路，`1600-1637` 张会把图像对数量抬到约 `1279200-1339066` 对，约为当前 `180` 张实验的 `79x-83x`
- 若要扩量，应优先走结构化扩容，而不是一次性全量灌入：先做 `300-600` 张级别的分组、连续段或加 `mask` 实验，再决定是否值得上更大规模

## 推荐恢复动作

当新线程里用户只说“继续”时，优先执行：

1. 阅读本文件与 `docs/project/tasks.md`
2. 检查 `git status --short` 与最近 `5` 个 commit
3. 用简短语言总结背景、现状、当前任务、下一步
4. 建立一个短计划
5. 直接开始当前最小下一步
