# 项目 Plan

最后更新：`2026-09-06`

本文件只维护**阶段结构**；具体执行顺序与 checklist 统一见 [`tasks.md`](tasks.md)。

## 已完成基础

- 已验收高质量 Single SOG 场景，并由 R2 经 `/edge-models/*` 提供。
- 已完成 React/Vite/PlayCanvas viewer、镜头、小地图、热点、基础加载反馈和按需渲染。
- 已上线 Cloudflare Pages，并建立 Workers + D1 + R2 的社区服务骨架。
- 已实现旧版 feed / detail / compose / 多图 / 点位关联等技术 PoC，并跑通过本地“场景 ↔ 内容”闭环。
- Content & Community v1 的产品决策已经完成，见 [`../decisions/2026-09-06-content-community-v1.md`](../decisions/2026-09-06-content-community-v1.md)。
- 训练、自研 streamed SOG 与算法实验历史已归档，不再作为当前主线。

## Phase 1：身份与领域模型

目标：先让长期数据关系正确，再叠 UI。

- 建立持久 User、Email OTP、Session 与 `ADMIN_USER_IDS` 管理员边界。
- 重构 Place / SpatialAnchor / Story / StoryDraft / StoryRevision 的领域模型。
- 建立 Story / Comment Like 与两层视觉评论所需的 Comment 数据关系。
- 把关键 invariant 下沉到 schema / service / tests：Story 至少有正文或图片、最多 12 图、v1 最多一个位置、公开写入必须绑定 User、Revision 审核切换规则。
- 建立最小稳定 gate / CI 入口，避免本轮大重构只靠 prose 约束。

## Phase 2：Story 生产与审核

目标：投稿者自己完成高质量录入，管理员只审核和校准。

- 完成 Story Editor：媒体排序 / 上传、optional title、正文、memoryTime、Place Picker、草稿自动保存。
- 完成共用 Spatial Anchor Editor：标 marker → 保存 camera pose → 回到 Story Editor。
- 跑通 Draft → Pending Review → Published / Changes Requested / Rejected。
- 完成 Revision：已发布内容修改时旧版继续在线，新 Revision 审核通过后替换。
- 完成 Admin Review：轻量元数据 / Anchor / Camera 修正、退回修改、发布、下架、soft delete。
- 用若水广场等首批约 5 个地点和真实照片跑通真实内容生产链路。

## Phase 3：消费体验与轻社交

目标：让“空间 → 地点 → Story → 讨论 → 回到空间”成为主产品，而不是旧论坛壳。

- Place 内容层：完整介绍 + masonry Story feed；滚动后收缩为 sticky title。
- PC 使用侧边内容层；Mobile 使用可扩展 Bottom Sheet。
- Place focus camera 使用人工 authoring 视角，并加入可取消 / 恢复的轻微 ambient 运镜。
- Story Detail：多图横滑、正文、memoryTime / Place / 作者、Like、Comment、Reply。
- 评论视觉最多两层；二级区继续回复时使用 `replyTo` 表达对象，不继续增加缩进。
- 完成评论隐藏 / 删除等基础 moderation。

## Phase 4：设备、场景与等待体验收口

目标：让核心产品在真实设备和真实网络条件下稳定可用。

- 收口桌面端 viewer + 内容层。
- iPhone Safari 真机验证 viewport、safe area、横竖屏、热点、rotate / pan / pinch zoom、Bottom Sheet 手势冲突。
- 验证 Android Chrome、iPad / 触屏设备核心链路。
- Loading 使用少量 Story thumbnail 做轻量生长 / 淡入；与真实模型加载并行，模型 ready 后立即进入。
- 根据真实体验再决定 navigation bounds；外围 skyline / 粗模不阻塞本阶段。

## Phase 5：发布与验证

目标：达到可以直接发给校友使用的 Content & Community v1。

- 完成 production 全链路 release acceptance：首次访问、登录、Draft 恢复、上传、审核、Revision、Place / Anchor、Story 浏览、Like、评论、返回场景。
- 覆盖慢网、OTP / API / 图片 / 模型失败和 R2 上传异常。
- 复验 Pages、Workers、D1、R2、`/api/*`、`/edge-models/*`、`/edge-media/*`。
- 找少量真实校友做首次可用性测试，观察是否能自然理解空间、投稿 Story、发现内容并形成讨论。

## Later

以下能力不阻塞 Content & Community v1：

- 多地点 Story、Anchor → Place 晋升机制。
- QQ / 微信 OAuth、用户主页、收藏、关注、私信和完整通知中心。
- 完整 User Ban / RBAC、评论图片和更复杂 moderation。
- Story 搜索、复杂筛选与推荐算法。
- 校园外围粗模 / skyline 与更精细 X/Z navigation bounds。
- 更高级 Loading、Streamed SOG / progressive rendering 的重新评估。
- 更完整的 D1 / R2 数据治理、孤儿对象清理和规模化索引优化。

只有当前业务目标明确要求时才重启这些方向。
