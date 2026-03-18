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
- 当前最关键风险仍然是素材能否支撑可看的空中版 `3DGS`
- `Iteration 001` 首轮 headless 评估指标为 `PSNR 20.25 / SSIM 0.599 / LPIPS 0.338`
- 当前结果已能辨识校园主结构，但存在明显 `floaters`、边缘拉花和局部遮挡伪影
- 下一步优先做更细的五向分组，不直接在当前均匀混合抽样结果上扩大素材范围
- 最终 checkpoint `outputs/iteration-001/train/unnamed/splatfacto/2026-03-18_230630/nerfstudio_models/step-000029999.ckpt` 当前约 `3.2 GB`
- 当前 Nerfstudio 数据格式支持给每帧补 `mask_path`；若边缘很多落在校外区域，下一轮可优先加 per-image campus mask

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

## 下一步建议

最优先建议先做下面这一个：

- 先把 `Iteration 001` 的均匀混合抽样结果拆回更细的五向分组，并评估 per-image campus mask，再做下一轮可比性验证

建议标准包括：

- 至少形成 `1-2` 个方向更纯净的候选子集
- 每个候选子集都继续使用相对路径作为素材标识
- 如果边缘主要落在校外区域，为每张图准备单通道 campus mask，`255 = keep`、`0 = ignore`
- 能对比新分组与当前均匀混合抽样结果的 `floaters`、结构完整度和位姿恢复稳定性
- 若分组后质量仍明显不够，再决定是否扩大素材范围

当前更小的下一步可拆成：

- 从现有 `PoC 001` 或原始素材中整理更细的五向/连续段候选分组
- 为 `outputs/iteration-001/processed/transforms.json` 设计可补 `mask_path` 的 mask 目录约定
- 为下一轮分组实验定义最小样本数和对比标准
- 复用现有训练链路，只改变素材组织方式
