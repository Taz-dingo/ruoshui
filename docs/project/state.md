# 项目状态快照

最后更新：`2026-07-04`

## 当前结论

若水广场已经从模型训练阶段进入业务开发阶段。正式场景使用已验收的 `assets/hhuc.sog`；当前不再继续训练、算法筛选或渐进式运行时实验。

## 当前架构

- 前端：`web/`，React + TypeScript + Vite + Zustand + PlayCanvas/SOG。
- 场景：镜头预设、小地图、热点、加载/错误反馈、按需渲染与性能诊断已具备。
- 社区：帖子流、详情、发布、多图和场景点位关联已接入前端；场景热点可直接预览点位笔记并进入完整社区。
- API：`services/forum-api/` 以 Cloudflare Workers 为主运行时，D1 保存关系数据，R2 保存媒体；Node/PostgreSQL 仅作 fallback 与 contract 对照。
- 部署：前端位于 `https://ruoshui-web.pages.dev`；生产主模型经 `R2 + Pages Functions` 的同源 `/edge-models/*` 路径提供。

## 已完成能力

- Web 场景可浏览、可切镜头、可查看热点并聚焦点位。
- 社区最小 feed/detail/compose 流程和本地媒体读取已落地。
- “场景点位 → 点位笔记 → 完整社区 → 详情 → 返回场景”已通过本地 Workers/D1 浏览器验证。
- Pages `/api/*` 可代理到 forum-api。
- 正式构建已移除重复或超限静态模型，只保留一份仓库源。
- 训练、素材 PoC 和算法筛选历史已移入 [`../archive/model-training/`](../archive/model-training/)。

## 当前交付状态

- `origin/main` 已包含 repo 静态资产瘦身与 Cloudflare 生产构建规则。
- 线上地址和基础服务已存在；每轮业务改动仍需本地 API 联调、浏览器主流程验证和生产构建验证。
- 真实社区内容仍少，当前产品价值更依赖首批正式故事点位和帖子，而不是继续扩技术壳。

## 已知风险

- Mobile Safari 的视口、安全区和双指交互仍需真机收口。
- D1/R2 已有最小链路，但分页、索引基线、媒体校验与孤儿清理尚未完整生产化。
- 内容种子必须走显式工具或管理流程，前端正常启动不得自动创建 scene/pin。
- 核心模型依赖边缘代理与 R2；部署验证需同时检查页面、API 和模型请求。

## 当前最高优先级

补齐首批真实故事点位、帖子正文与媒体，并建立显式内容种子或管理流程，替换当前本地联调内容。

具体任务见 [`tasks.md`](tasks.md)，长期踩坑见 [`engineering-memory.md`](engineering-memory.md)。
