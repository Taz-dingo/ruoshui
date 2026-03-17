# 项目状态快照

最后更新：`2026-03-18`

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

## 当前已知素材状态

- 原始素材目录：`assets/raw`
- 总图片数：`1637`
- 总体积：约 `10.02 GB`
- 分辨率：统一为 `4000x3000`
- 目录：`101MEDIA` 与 `102MEDIA`
- 跨目录重名文件组：`638`

## 当前 top task

当前最重要的任务是：

- 安装并跑通 `Iteration 001` 的首轮命令

这一步的目标不是前端展示，而是验证：

- 均匀抽样后的五向素材是否足以恢复稳定相机位姿
- 是否能得到可辨识的空中版 `3DGS` 结果
- 是否值得继续扩大素材范围或先做人工五向分类

## 当前关键文件

优先读取：

- `README.md`
- `docs/project/spec.md`
- `docs/project/plan.md`
- `docs/project/tasks.md`
- `docs/project/state.md`

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

## 推荐恢复动作

当新线程里用户只说“继续”时，优先执行：

1. 阅读本文件与 `docs/project/tasks.md`
2. 检查 `git status --short` 与最近 `5` 个 commit
3. 用简短语言总结背景、现状、当前任务、下一步
4. 建立一个短计划
5. 直接开始当前最小下一步
