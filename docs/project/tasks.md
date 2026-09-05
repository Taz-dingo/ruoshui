# 当前任务

最后更新：`2026-09-06`

本文件只维护**当前执行顺序**。已经成立的事实写入 [`state.md`](state.md)，稳定产品边界写入 [`spec.md`](spec.md)，阶段结构写入 [`plan.md`](plan.md)，人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)。

当前目标：完成 **Content & Community v1**，让真实校友能从登录、投稿、审核、发布到阅读、点赞、评论形成完整闭环。

## P0：先把长期数据关系与工程约束立住

### 1. 最小 Gate / CI 基建

- [ ] 建立稳定 root gate 命令，覆盖至少 typecheck、build 和本轮新增测试；本地支持按修改面跑最小 gate，CI 跑完整 gate。
- [ ] 为 Content & Community v1 的关键 invariant 建测试 / schema 约束：Story 正文或图片至少一项非空、最多 12 图、v1 最多一个位置、公开写入必须绑定 User、Revision 未审核不得替换 Published Revision。
- [ ] 为正常阅读路径补回归验证：不得隐式创建 Scene / Place / Story 等业务数据。
- [ ] 每完成一个 product-visible slice，至少补一条真实入口 / 真实副作用 smoke；不要只验证组件或 mock。

### 2. User / Auth

- [ ] 建立持久 `User`、Email AuthIdentity、OTP challenge、Session 数据模型。
- [ ] 实现 Email OTP 登录 / 注册一体流程；不设密码。
- [ ] 第一次登录可设置 displayName，也可跳过并使用系统默认展示名；昵称允许重复。
- [ ] Story Editor、评论 / 回复入口要求先登录；点赞允许触发登录后补做原操作。
- [ ] 实现改邮箱：旧邮箱 OTP + 新邮箱 OTP，成功后 revoke 其他 sessions；旧邮箱不可访问时保留人工处理路径。
- [ ] 管理员权限由环境变量 `ADMIN_USER_IDS` 中的稳定 userId allowlist 判断；权限必须在 API / service 层强制执行。

### 3. Place / Anchor / Story 数据模型

- [ ] 引入 `SpatialAnchor` contract：marker position + camera pose（position / target / fov）。
- [ ] 引入 `Place`：公共 Anchor + name / intro 等元数据；人工维护最佳 focus camera。
- [ ] v1 Story location 只允许三选一：已有 Place / 自定义 Anchor / 无位置。
- [ ] 重构 Story 为 Draft / Revision / Published 关系；title optional、body optional、media <= 12、memoryTime optional。
- [ ] 让旧 forum 技术骨架逐步迁移，不为了命名整洁一次性重写无关内部模块。

## P1：Story 生产与审核

### 4. Story Editor

- [ ] 做单页 Composer：顶部媒体区 → optional title → 普通多行 body → memoryTime → location → 提交审核。
- [ ] 照片支持最多 12 张、拖拽排序、第一张默认 cover、删除、上传中 / 失败 / 重试状态。
- [ ] 纯文字 Story 在 Feed 使用 TextCover；无 title 时从 body 提取 display title；纯图片 fallback 使用 `memoryTime + Place`。
- [ ] 登录用户产生第一项有意义内容后创建 server-side StoryDraft，并自动保存；支持跨会话恢复。
- [ ] PC / Mobile 复用同一信息结构，不做两套产品。

### 5. Place Picker / Spatial Anchor Editor

- [ ] Story Editor 中提供搜索式 Place Picker。
- [ ] “标记一个特别的角落”进入共用 Anchor Editor：标落点 → 调整镜头 → 保存 → 返回原 StoryDraft 与原滚动位置。
- [ ] 普通投稿保存为 proposed anchor；Admin 审核时复用同一编辑器做轻量校准。
- [ ] Place focus camera 不再从统一 offset 临时计算，而是使用人工保存 pose。

### 6. Review / Revision / 内容治理

- [ ] 跑通 Draft → Pending Review → Published / Changes Requested / Rejected。
- [ ] Admin 可以修轻量元数据、错别字、Anchor / Camera；正文或语义实质修改退回作者。
- [ ] 已发布 Story 修改创建新 Revision；旧 Published Revision 继续在线，新 Revision 审核通过后原子替换。
- [ ] 用户可主动下架；删除先 soft delete。
- [ ] Admin Review 页面至少支持：预览、校准位置 / 镜头、批准、退回修改、拒绝、下架。

## P2：消费体验与轻社交

### 7. Place Story Feed

- [ ] 点击 Place 后镜头过渡到人工 focus pose，并加入轻微 ambient 运镜；用户手动操作时立即退出，可在合适条件下恢复。
- [ ] Place 内容层顶部是地点标题 / 介绍，下方直接展示 Story masonry feed。
- [ ] 只有滚到顶部时展示完整介绍；下滚后收缩为 sticky title。
- [ ] PC 使用较窄侧边内容层；Mobile 使用可扩展 Bottom Sheet。
- [ ] 内容量增加后再补地点内筛选；不要提前做复杂推荐算法。

### 8. Story Detail

- [ ] 多图使用横滑；展示作者、memoryTime、Place / Anchor、正文、Like 和 Comment。
- [ ] 在同一内容容器中从 Place Feed 进入 Detail，并支持返回；全局 Story 入口可直接打开 Detail。
- [ ] 纯文字 / 纯图片 Story 都保持完整可读，不强制生成不存在的标题或正文。

### 9. Like / Comment / Reply

- [ ] Story 和 Comment 都支持 Like，按 `userId + targetId` 保证单用户单次状态。
- [ ] 评论必须先登录；v1 只支持文字。
- [ ] 视觉只保留两层：一级评论 + 二级讨论区；更深回复通过 `rootCommentId` + `replyToCommentId` 展示“回复某人”，不继续缩进。
- [ ] 支持评论隐藏 / 删除等基础 moderation；完整 User Ban 暂不实现。

## P3：真实内容、设备与发布收口

### 10. 首批正式内容

- [ ] 先选约 5 个正式 Place，优先把“若水广场”做到完整。
- [ ] 用真实照片与 Story 跑通完整上传 / 审核 / 发布链路，不再依赖测试数据判断 UI。
- [ ] 个人历史照片按地点粗筛后再精选，避免无目标处理完整照片库。

### 11. Loading

- [ ] 与模型加载并行请求少量 Story thumbnail，总量保持轻量；按真实资源完成状态做简单 scale / opacity / blur 生长效果。
- [ ] 模型 ready 后立即自然切入 3D，不为了播完动画故意等待。
- [ ] 不重启自研 Streamed SOG / progressive splat；Production 继续使用完整 Single SOG。

### 12. Mobile / 场景 / Release Acceptance

- [ ] iPhone Safari 真机验证 viewport、safe area、横竖屏、热点、单指 rotate、双指 pan + pinch zoom、Bottom Sheet 与 3D 手势冲突。
- [ ] 验证 Android Chrome 与 iPad / 触屏核心链路。
- [ ] 复验桌面端 Place / Story / Editor / Review / Social 全链路。
- [ ] 做 production acceptance：OTP、Draft 恢复、上传、Review、Revision、API / 图片 / 模型失败、Like / Comment、返回场景、Pages / Workers / D1 / R2。
- [ ] 找少量真实校友做可用性测试，重点观察投稿摩擦、空间理解、Story 阅读与讨论是否自然。

## Later

- [ ] 多地点 Story；Anchor → Place 晋升机制。
- [ ] QQ / 微信 OAuth、用户主页、收藏、关注、私信、通知中心。
- [ ] 完整 User Ban / RBAC、评论图片和复杂 moderation。
- [ ] Story 搜索、复杂筛选、推荐算法。
- [ ] 校园外围 skyline / 粗模与更精细 X/Z navigation bounds。
- [ ] 更高级 Loading、Streamed SOG / progressive rendering 的重新评估。
- [ ] D1 分页、索引、R2 孤儿对象清理和更完整媒体治理按真实规模补齐。

训练、旧 progressive runtime PoC 和算法筛选已归档；不要放回当前任务池。
