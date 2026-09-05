# 当前任务

最后更新：`2026-09-06`

本文件只维护**当前执行顺序**。已经成立的事实写入 [`state.md`](state.md)，稳定产品边界写入 [`spec.md`](spec.md)，阶段结构写入 [`plan.md`](plan.md)，人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)。

当前目标：完成 **Content & Community v1**，让真实校友能从登录、投稿、审核、发布到阅读、点赞、评论形成完整闭环。

## P0：生产 Auth 收口

### 1. 腾讯云 SES

- [x] 保持 `AuthEmailSender` provider abstraction，不改 OTP / User / Session 上层逻辑。
- [x] Worker 改为直接调用腾讯云 SES API 3.0 `SendEmail`，使用 `TC3-HMAC-SHA256`；移除 Cloudflare `EMAIL` binding 依赖。
- [x] 默认公开配置：`AUTH_EMAIL_FROM=no-reply@auth.tazdingo.net`、`AUTH_EMAIL_FROM_NAME=若水`、`TENCENT_SES_REGION=ap-guangzhou`。
- [ ] 腾讯云验证 `auth.tazdingo.net` 发信域名并配置 SES 要求的 SPF / DKIM。
- [ ] 腾讯云创建 / 验证 `no-reply@auth.tazdingo.net` 发信地址。
- [ ] 创建 OTP 模板并通过审核：模板使用单变量 `{{code}}`，静态注明 10 分钟有效。
- [ ] 给 Worker 配置 `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`、`TENCENT_SES_TEMPLATE_ID`；Secret 不进入 Git。
- [ ] 部署生产 Worker 并跑真实 smoke：request OTP → 实际收件 → verify → `/me` → StoryDraft create / patch → 跨请求 Session。

### 2. Auth 后续

- [x] 持久 User、Email AuthIdentity、OTP challenge、Session 数据模型。
- [x] Email OTP 登录 / 注册 backend：OTP 哈希、60 秒 resend、失败次数、10 分钟 TTL、90 天 Session。
- [x] Web 第一次登录流程：Email OTP；可设置 displayName，也可跳过使用默认展示名。
- [x] Story Editor 进入前要求登录。
- [x] 管理员权限由 `ADMIN_USER_IDS` 稳定 userId allowlist 在 API 层强制执行。
- [ ] 评论 / 回复进入前要求登录；点赞触发登录后补做原操作。
- [ ] 改邮箱：旧邮箱 OTP + 新邮箱 OTP，成功后 revoke 其他 sessions；旧邮箱不可访问时走人工处理。

## P1：Place → Story 正式消费体验

### 3. Place pins / focus

- [ ] 完成动态 Place pins 从 Places API → viewer runtime → PlayCanvas 投影 → React overlay 的正式链路。
- [ ] 点击 Place 后使用人工保存的完整 camera pose（position / target / fov），不再使用旧 forum 固定 offset。
- [ ] 加入轻微 ambient focus 运镜；用户操作立即取消，合适条件下可恢复。

### 4. Place Memory Panel

- [ ] Place 顶部完整标题 / intro，下方直接 masonry Published Story feed。
- [ ] 下滚后 intro 收缩为 sticky title。
- [ ] PC 使用较窄侧边内容层；Mobile 使用可扩展 Bottom Sheet。
- [ ] Published Story feed 只使用新 `/api/published-stories` read model，不回退到旧 forum 数据。
- [ ] 纯文字 Story 使用 TextCover；纯图片 / 无 title Story 使用既定 fallback display title。

### 5. Story Detail

- [ ] 同一内容容器内从 Place Feed 打开 Story Detail，并可返回原滚动位置。
- [ ] 多图横滑；展示作者、memoryTime、Place / custom Anchor、正文。
- [ ] “回到这里”调用 Story / Place 的 SpatialAnchor camera pose 返回 3D。

## P2：Social / Revision 收口

### 6. Like / Comment / Reply

- [ ] Story Like + Comment Like 接持久 User。
- [ ] 评论只支持文字，必须登录。
- [ ] UI 只保留两层视觉：一级评论 + 二级讨论区；更深回复使用 `rootCommentId` + `replyToCommentId`，不继续缩进。
- [ ] 评论隐藏 / 删除等基础 moderation；完整 User Ban 暂不做。

### 7. 作者侧已发布 Story 管理

- [ ] 已发布 Story 编辑时创建新 Revision；旧 Published Revision 在审核通过前继续公开。
- [ ] 用户可主动下架。
- [ ] 删除先 soft delete，媒体物理清理由后续治理流程处理。

## 已完成的 Content & Community 基础

- [x] 根 `pnpm check` + GitHub Actions CI。
- [x] User / SpatialAnchor / Place / Story / StoryRevision / StoryDraft / Comment / Like shared contracts 与 D1 schema。
- [x] Story body/media、<=12 图、单位置、Draft ownership、media ownership、Published Revision 等关键 invariant。
- [x] StoryDraft create / list / get / patch / submit。
- [x] authenticated Story media upload ownership。
- [x] Place read / admin authoring API。
- [x] Web Story Composer：OTP、草稿恢复 / autosave、12 图、排序、Place、提交审核。
- [x] 共用 3D Spatial Anchor Editor。
- [x] Review backend + Admin Review Console：queue、受保护 media、轻量校准、approve / request changes / reject。
- [x] Published Story public read API，只暴露当前 `publishedRevisionId` 及其媒体。

## P3：真实内容、设备与发布收口

### 8. 首批正式内容

- [ ] 先选约 5 个正式 Place，优先把“若水广场”做到完整。
- [ ] 用真实照片与 Story 跑通 upload → review → publish → Place Feed → Detail 全链路。

### 9. Loading

- [ ] 并行请求少量 Story thumbnail，用简单 scale / opacity / blur 生长效果覆盖等待。
- [ ] 模型 ready 后立即切入 3D；不重启自研 Streamed SOG / progressive splat。

### 10. Mobile / Release Acceptance

- [ ] iPhone Safari 真机验证 viewport、safe area、横竖屏、Place pins、单指 rotate、双指 pan + pinch zoom、Bottom Sheet 与 3D 手势冲突。
- [ ] 验证 Android Chrome 与 iPad / 触屏核心链路。
- [ ] production acceptance 覆盖 OTP、Draft 恢复、上传、Review、Revision、API / 图片 / 模型失败、Like / Comment、返回场景、Pages / Workers / D1 / R2 / 腾讯云 SES。
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
