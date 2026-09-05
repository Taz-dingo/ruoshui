# 当前任务

最后更新：`2026-09-06`

本文件只维护**当前执行顺序**。已经成立的事实写入 [`state.md`](state.md)，稳定产品边界写入 [`spec.md`](spec.md)，阶段结构写入 [`plan.md`](plan.md)，人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)。

当前目标：完成 **Content & Community v1**，让真实校友能从登录、投稿、审核、发布到阅读、点赞、评论形成完整闭环。

## P0：先把长期数据关系与工程约束立住

### 1. 最小 Gate / CI 基建

- [x] 建立稳定 root gate 命令，覆盖 typecheck、tests、build；GitHub Actions 在 PR 与 main push 上执行完整 gate。
- [x] 已机械化第一批核心 invariant：Story 正文或图片至少一项非空、最多 12 图、v1 位置互斥、Draft 与 Submit 校验分离、StoryDraft 所有权与提交状态。
- [ ] 为正常阅读路径补回归验证：不得隐式创建 Scene / Place / Story 等业务数据。
- [ ] 随 product-visible slice 增加真实入口 / 真实副作用 smoke，不只验证组件或 mock。

### 2. User / Auth

- [x] 建立持久 `User`、Email AuthIdentity、OTP challenge、Session 数据模型。
- [x] 完成 Email OTP 登录 / 注册 backend：OTP 哈希、限频、失败次数、持久 Session、`/me`、logout、displayName 更新。
- [ ] 配置生产 Email Service binding、`AUTH_EMAIL_FROM`、`AUTH_OTP_SECRET` 并应用 D1 migration；D1 migration 与 `AUTH_OTP_SECRET` 已完成，Email binding/from 因账号没有 Cloudflare zone 阻塞；配置完成前生产 auth 保持关闭。
- [ ] 第一次登录 UI：可设置 displayName，也可跳过并使用系统默认展示名。
- [ ] Story Editor、评论 / 回复入口要求先登录；点赞允许触发登录后补做原操作。
- [ ] 实现改邮箱：旧邮箱 OTP + 新邮箱 OTP，成功后 revoke 其他 sessions；旧邮箱不可访问时保留人工处理路径。
- [ ] 管理员权限由环境变量 `ADMIN_USER_IDS` 中的稳定 userId allowlist 判断；权限必须在 API / service 层强制执行。

### 3. Place / Anchor / Story 数据模型

- [x] 引入 `SpatialAnchor` contract：marker position + camera pose（position / target / fov）。
- [x] 引入 `Place` 数据模型：公共 Anchor + name / intro / 人工 focus camera。
- [x] v1 Story location 三选一：已有 Place / 自定义 Anchor / 无位置。
- [x] 建立 Story / StoryRevision / ordered media / Draft / Published 数据关系；title optional、body optional、media <= 12、memoryTime optional。
- [x] 建立 Story/Comment Like 与两层评论关系的底层表结构；前台行为尚未实现。
- [ ] 旧 forum 技术骨架逐步迁移到新领域模型，不做一次性无意义重写。

## P1：Story 生产与审核

### 4. Story Draft backend

- [x] 已完成登录用户的 Draft create / list / get / patch / submit API。
- [x] Draft 可以不完整；提交时才要求 body / media 至少一项。
- [x] 提交前验证关联媒体均为 ready；其他用户不能读取或修改该 Draft。
- [x] `changes_requested` Revision 可继续编辑，编辑后回到 `draft`。
- [ ] 媒体上传链路迁移到正式 User / Draft 所有权模型；当前旧 storage / media confirm 仍是 PoC 路径。

### 5. Story Editor

- [ ] 做单页 Composer：顶部媒体区 → optional title → 普通多行 body → memoryTime → location → 提交审核。
- [ ] 照片支持最多 12 张、拖拽排序、第一张默认 cover、删除、上传中 / 失败 / 重试状态。
- [ ] 纯文字 Story 在 Feed 使用 TextCover；无 title 时从 body 提取 display title；纯图片 fallback 使用 `memoryTime + Place`。
- [ ] 前端接入 server-side StoryDraft 自动保存与跨会话恢复。
- [ ] PC / Mobile 复用同一信息结构，不做两套产品。

### 6. Place Picker / Spatial Anchor Editor

- [ ] 提供 Place read / authoring API 与搜索式 Place Picker。
- [ ] “标记一个特别的角落”进入共用 Anchor Editor：标落点 → 调整镜头 → 保存 → 返回原 StoryDraft 与原滚动位置。
- [ ] 普通投稿保存为 proposed anchor；Admin 审核时复用同一编辑器做轻量校准。
- [ ] Place focus camera 不再从统一 offset 临时计算，而是使用人工保存 pose。

### 7. Review / Revision / 内容治理

- [ ] 跑通 Pending Review → Published / Changes Requested / Rejected 的 Admin API 与 UI。
- [ ] Admin 可以修轻量元数据、错别字、Anchor / Camera；正文或语义实质修改退回作者。
- [ ] 已发布 Story 修改创建新 Revision；旧 Published Revision 继续在线，新 Revision 审核通过后原子替换。
- [ ] 用户可主动下架；删除先 soft delete。

## P2：消费体验与轻社交

### 8. Place Story Feed

- [ ] 点击 Place 后镜头过渡到人工 focus pose，并加入轻微 ambient 运镜；用户手动操作时立即退出，可在合适条件下恢复。
- [ ] Place 内容层顶部是地点标题 / 介绍，下方直接展示 Story masonry feed；下滚后收缩为 sticky title。
- [ ] PC 使用较窄侧边内容层；Mobile 使用可扩展 Bottom Sheet。

### 9. Story Detail / Social

- [ ] Story Detail 多图横滑；展示作者、memoryTime、Place / Anchor、正文、Like、Comment。
- [ ] Story 和 Comment Like 接入持久 User。
- [ ] 评论必须先登录；v1 只支持文字。
- [ ] 视觉只保留两层：一级评论 + 二级讨论区；更深 reply 用 `rootCommentId` + `replyToCommentId`，不继续缩进。
- [ ] 支持评论隐藏 / 删除等基础 moderation；完整 User Ban 暂不实现。

## P3：真实内容、设备与发布收口

### 10. 首批正式内容

- [ ] 先选约 5 个正式 Place，优先把“若水广场”做到完整。
- [ ] 用真实照片与 Story 跑通完整上传 / 审核 / 发布链路。

### 11. Loading

- [ ] 并行请求少量 Story thumbnail，用简单 scale / opacity / blur 生长效果覆盖等待。
- [ ] 模型 ready 后立即切入 3D；不重启自研 Streamed SOG / progressive splat。

### 12. Mobile / Release Acceptance

- [ ] iPhone Safari 真机验证 viewport、safe area、横竖屏、热点、单指 rotate、双指 pan + pinch zoom、Bottom Sheet 与 3D 手势冲突。
- [ ] 验证 Android Chrome 与 iPad / 触屏核心链路。
- [ ] production acceptance 覆盖 OTP、Draft 恢复、上传、Review、Revision、API / 图片 / 模型失败、Like / Comment、返回场景、Pages / Workers / D1 / R2。
- [ ] 找少量真实校友做可用性测试。

## Later

- [ ] 多地点 Story；Anchor → Place 晋升机制。
- [ ] QQ / 微信 OAuth、用户主页、收藏、关注、私信、通知中心。
- [ ] 完整 User Ban / RBAC、评论图片和复杂 moderation。
- [ ] Story 搜索、复杂筛选、推荐算法。
- [ ] 校园外围 skyline / 粗模与更精细 X/Z navigation bounds。
- [ ] 更高级 Loading、Streamed SOG / progressive rendering 的重新评估。
- [ ] D1 分页、索引、R2 孤儿对象清理和更完整媒体治理按真实规模补齐。

训练、旧 progressive runtime PoC 和算法筛选已归档；不要放回当前任务池。
