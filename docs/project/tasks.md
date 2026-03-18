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

## 迭代记录模板

### Iteration X

- 目标：
- 输入：
- 输出：
- 验证方式：
- 结果：
- 问题：
- 下一步：

## 下一步建议

最优先建议先做下面这一个：

- 在 CUDA 环境中继续并判断 `Iteration 001` 的首轮 `splatfacto` 训练结果

建议标准包括：

- 已按 `docs/iterations/iteration-001-execution.md` 补齐环境依赖
- 继续沿用 `./.venv-iteration001` 作为 `Nerfstudio` 的独立运行环境
- 明确 staging 输入来自 `assets/staging/poc-001/images`
- 已将实际安装方式、命令和参数持续写回 `docs/iterations/iteration-001-validation.md`
- 当前优先准备 CUDA 环境继续首轮训练

当前更小的下一步可拆成：

- 已确认 `outputs/iteration-001/processed/transforms.json` 与 `outputs/iteration-001/processed/sparse_pc.ply` 已生成
- 先按 `docs/iterations/iteration-001-cuda-handoff.md` 在 CUDA 机器上恢复环境
- 在 CUDA 机器上运行 `ns-train splatfacto --output-dir outputs/iteration-001/train nerfstudio-data --data outputs/iteration-001/processed`
- 记录训练产物路径、耗时与可视质量
