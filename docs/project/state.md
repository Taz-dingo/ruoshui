# 项目状态快照

最后更新：`2026-09-06`

本文件只记录**当前已经成立的事实与尚未成立的事实**。下一步执行顺序见 [`tasks.md`](tasks.md)。

## 当前阶段

若水已经完成底层 3D / Cloudflare / 旧社区技术骨架，并完成 Content & Community v1 的主要产品决策。项目正式进入一次较大的领域模型与产品交互重构：目标是从“3D viewer + forum PoC”收束成**空间 → Place / Anchor → Story → 讨论 → 回到空间**的校园记忆产品。

正式场景继续使用完整 Single SOG，经同源 `/edge-models/hhuc-original.sog` 从 R2 提供。自研 Streamed SOG / LOD 只保留历史实验，不作为当前产品主线。

## 已经具备

- `web/`：React + TypeScript + Vite + Zustand + PlayCanvas/SOG viewer。
- 场景基础：镜头预设、小地图、热点、加载反馈、按需渲染。
- 手机 3D 交互逻辑已具备：单指 rotate、双指 pan + pinch zoom；仍需真机 polish。
- viewer UI：桌面底部 dock 与移动端抽屉已有基础实现。
- 旧社区技术骨架：feed / detail / compose / 多图 / 场景点位关联已接入。
- 服务主路径：Cloudflare Pages + Workers + D1 + R2；Node/PostgreSQL 仅作明确 fallback。
- 本地已验证“场景点位 → 内容 → 详情 → 返回场景”的技术闭环。
- Pages `/api/*` 可代理到 forum-api；正式模型通过 `/edge-models/*` 提供。
- 人机协作长期规则已经沉淀到 [`agent-collaboration.md`](agent-collaboration.md)；Content & Community v1 的主要产品 rationale 已记录到 [`../decisions/2026-09-06-content-community-v1.md`](../decisions/2026-09-06-content-community-v1.md)。

## 已确定但尚未实现的产品 contract

### 空间与内容

- `SpatialAnchor` = marker position + camera pose；`Place` = 被命名 / 公共化的 Anchor。
- v1 一个 Story 最多一个位置：已有 Place / 自定义 Anchor / 无位置三选一。
- Place 点击后使用人工维护的 focus camera，并允许轻微 ambient 运镜；用户手动操作会退出自动运镜。
- Place 内容层顶部是地点标题 / 介绍，下方直接是 Story masonry feed；下滚后收缩为 sticky title。
- PC 用侧边内容层，Mobile 用可扩展 Bottom Sheet；Story Detail 在同一容器中打开并可返回。

### Story / 投稿

- Story title optional；body / media 至少一项非空；最多 12 张图片；第一张默认 cover。
- memoryTime 是 optional 的模糊人类时间；`createdAt` 不作为故事发生时间。
- Story Editor 采用简单 Composer，不做复杂富文本；Place Picker 与 3D Anchor Editor 都要低摩擦。
- 用户进入 Story Editor 前必须先建立正式 User；Draft 只属于登录用户并支持自动保存。
- 投稿者自己完成文字、照片、Place / Anchor 和建议镜头；管理员只审核 / 轻量校准，不重新录入。
- 已发布 Story 修改使用 Revision；新版本审核期间旧版本继续在线。

### User / Social

- v1 Auth = Email OTP + persistent User / Session；业务只引用稳定 userId。
- Story 投稿、评论 / 回复都要求先登录；点赞可在点击时触发登录并补做操作。
- displayName 可重复；第一次登录可跳过设置并使用默认展示名；Story / 评论不支持匿名展示。
- Story 和 Comment 都支持 Like。
- 评论 UI 是 Story 主楼 → 一级评论 → 二级讨论区；更深 reply 不继续缩进。
- v1 先做评论隐藏 / 删除等 moderation，不做完整 User Ban / RBAC。
- 管理员由环境变量 `ADMIN_USER_IDS` allowlist 产生。

## 当前实现差距

- 现有 D1 / shared schema 仍是旧 `ScenePin + ForumPost` 结构，没有 User/Auth、StoryDraft/Revision、Place/Anchor、Like/Comment 新领域模型。
- 当前 `CommunitySheet` 仍是“社区笔记 / 推荐流 / 写笔记”的通用论坛形态，不代表最终 Place / Story UI。
- 当前 pin focus camera 仍通过统一 offset 临时计算，还没有为每个 Place 保存独立 camera pose。
- 当前正常社区刷新仍存在 `ensureCommunityScene()` 写路径，需要迁移到显式 seed / admin 流程，满足“阅读路径只读”的 contract。
- 真实照片、真实 Place、真实 Story 和审核链路仍未正式落库。
- Repo 尚未建立完整 CI / gate orchestration；根脚本目前主要只有 build / typecheck。本轮大重构需要优先把关键 invariant 机械化。

## 场景与发布后置项

- X/Z campus navigation bounds 尚未正式限制；当前主要是 Y、pitch、distance 约束。
- 校园外围 skyline / 粗模保留为未来 polish，不阻塞 Content & Community v1。
- Loading 只计划先做轻量 Story thumbnail 生长 / 淡入，不重启 progressive SOG 研发。
- Mobile Safari、Android、iPad / 触屏仍需真实设备验收。
- 最终仍需完整 production release acceptance 和少量真实校友测试。

## 当前判断

下一阶段不再讨论大方向，而是按 [`tasks.md`](tasks.md) 进入实现：

1. 先建立最小 gate、User/Auth 与正确领域模型；
2. 再做 Story Editor / Anchor Editor / Review；
3. 然后替换旧社区壳为 Place Feed / Story Detail / Like / Comment；
4. 最后做真实内容、Mobile、Loading 与发布收口。

产品边界见 [`spec.md`](spec.md)；阶段结构见 [`plan.md`](plan.md)；人机协作与防腐规则见 [`agent-collaboration.md`](agent-collaboration.md)；部署 / 排障规则见 [`engineering-memory.md`](engineering-memory.md)。
