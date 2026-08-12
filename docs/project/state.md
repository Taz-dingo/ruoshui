# 项目状态快照

最后更新：`2026-07-10`

## 当前阶段

若水广场已进入业务开发阶段。正式场景经同源 `/edge-models/hhuc-original.sog` 从 R2 提供；训练和算法筛选已结束并归档，`hhuc-streamed-v2` 作为实验性 LOD 入口保留，用于和原始版做加载体感对照。

## 当前系统

- `web/`：React + TypeScript + Vite + Zustand + PlayCanvas/SOG viewer。
- 场景：镜头预设、小地图、热点、加载反馈、按需渲染已具备。
- 社区：feed / detail / compose / 多图 / 场景点位关联已接入。
- 服务：`services/forum-api/` 以 Cloudflare Workers + D1 + R2 为主；Node/PostgreSQL 仅作 fallback。
- 部署：前端在 `https://ruoshui-web.pages.dev`；生产模型经同源 `/edge-models/*` 提供。

## 已验证主流程

- Web 场景可浏览、可切镜头、可查看热点并聚焦点位。
- “场景点位 → 点位笔记 → 完整社区 → 详情 → 返回场景”已通过本地 Workers/D1 浏览器验证。
- Pages `/api/*` 可代理到 forum-api。
- 仓库只保留一份正式模型源；训练历史已移入 [`../archive/model-training/`](../archive/model-training/)。

## 当前重点

- 补齐首批真实故事点位、正文和媒体。
- 建立显式内容种子或管理流程，替换本地联调占位内容。

## 已知风险

- Mobile Safari 的视口、安全区和双指交互仍需真机收口。
- D1/R2 只有最小链路；分页、索引、媒体校验和孤儿清理尚未完整生产化。
- 内容种子必须走显式工具或管理流程，前端正常启动不得自动创建 scene/pin。
- 核心模型依赖边缘代理与 R2；部署验证需同时检查页面、API 和模型请求。

需要下一步时读 [`tasks.md`](tasks.md)；需要部署/排障规则时读 [`engineering-memory.md`](engineering-memory.md)。
