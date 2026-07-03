# 当前任务

最后更新：`2026-07-04`

## P0

- [ ] 选定首批正式故事点位，补坐标、标题、正文和媒体；建立显式种子/管理流程，禁止页面启动时自动写库。
- [ ] 复验生产 Pages、`/api/*` 和 `/edge-models/*` 三条关键链路。

## P1

- [ ] 完成 Mobile Safari 视口、安全区、旋转和双指交互真机收口。
- [ ] 为 D1 feed/detail 查询补分页、索引检查和稳定错误契约。
- [ ] 为 R2 上传补类型/大小/签名校验、确认入库与孤儿对象清理策略。
- [ ] 补社区 feed/detail/compose 的加载、空态、错误态和并发请求回收。
- [ ] 整理点位 authoring 与内容验收流程，避免手工数据库操作成为长期路径。

## P2

- [ ] 基于真实访问数据继续优化首屏、按需渲染和移动端 GPU 成本。
- [ ] 在内容闭环稳定后，再评估点赞、收藏和浏览计数。
- [ ] 登录、审核、开放投稿、CMS 和 WebGPU/WASM 性能分支继续延后。

## 已结束方向

模型训练、素材 PoC、Scaffold-GS/Octree-GS/CityGaussian 筛选和 progressive runtime 已结束并归档。历史结论见 [`../archive/model-training/`](../archive/model-training/)；除非用户明确重启该方向，否则不要把归档任务放回当前任务池。
