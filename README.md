# 若水广场

若水广场是一个以常州老校区为对象的 Web 数字纪念项目。当前以现成高质量 `SOG` 场景为核心，重点开发 viewer 体验、故事点位、社区笔记和 Cloudflare 业务服务。

## 当前阶段

模型训练与算法路线筛选已经结束。当前主线是：

1. 收口桌面与移动端场景体验；
2. 把故事内容绑定到真实场景点位；
3. 完成“点位图文 ↔ 完整社区 ↔ 返回场景”的业务闭环；
4. 强化 `Cloudflare Pages + Workers + D1 + R2` 的生产数据与媒体链路。

第一版仍不开放登录、审核和大规模 UGC。场景资产、内容和服务先以可控方式发布。

## 仓库结构

- `web/`：React、Vite 与 PlayCanvas/SOG viewer。
- `services/forum-api/`：Cloudflare Workers 社区 API，保留 Node fallback。
- `packages/shared/`：前后端共享 contract。
- `assets/hhuc.sog`：正式场景资产的仓库源。
- `docs/project/`：当前产品、状态、任务和工程记忆。
- `docs/archive/`：已结束的训练与实验历史，不进入默认恢复上下文。

## 开始工作

先读：

- [`docs/project/state.md`](docs/project/state.md)
- [`docs/project/tasks.md`](docs/project/tasks.md)
- [`docs/project/spec.md`](docs/project/spec.md)
- [`docs/project/engineering-memory.md`](docs/project/engineering-memory.md)

开发前按 [`AGENTS.md`](AGENTS.md) 启用对应 repo skill；每轮保持小而完整，验证后提交并通过 PR 更新。
