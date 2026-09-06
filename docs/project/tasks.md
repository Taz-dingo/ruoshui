# 当前任务

最后更新：`2026-09-06`

本文件只维护**当前执行顺序**。已经成立的事实写入 [`state.md`](state.md)，稳定产品边界写入 [`spec.md`](spec.md)，阶段结构写入 [`plan.md`](plan.md)，人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)。

当前目标：技术闭环已经基本成立，接下来把若水从“能跑的产品骨架”推进成**有真实地点、真实照片和真实故事可消费的校园记忆地图**。

## P0：生产 Auth 外部配置

### 1. 腾讯云 SES

- [x] 保持 `AuthEmailSender` provider abstraction，不改 OTP / User / Session 上层逻辑。
- [x] Worker 直接调用腾讯云 SES API 3.0 `SendEmail`，使用 `TC3-HMAC-SHA256`。
- [x] 默认公开配置：`AUTH_EMAIL_FROM=no-reply@auth.tazdingo.net`、`AUTH_EMAIL_FROM_NAME=若水`、`TENCENT_SES_REGION=ap-guangzhou`。
- [x] 腾讯云验证 `auth.tazdingo.net` 发信域名并配置 SES 要求的 SPF / DKIM。
- [x] 腾讯云创建 / 验证 `no-reply@auth.tazdingo.net` 发信地址。
- [ ] 创建 OTP 模板并通过审核：模板使用单变量 `{{code}}`，静态注明 10 分钟有效。
- [x] 给 Worker 配置 `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`；Secret 不进入 Git。
- [ ] 给 Worker 配置审核通过的 `TENCENT_SES_TEMPLATE_ID`；模板 ID 不进入代码逻辑以外的敏感日志。
- [x] 已部署最新 `main` `3a0bf36` 对应的生产 Worker；当前版本为 `91bdbbc0-62d9-4c56-a03a-add0ca320253`。
- [ ] 模板审核通过后配置 `TENCENT_SES_TEMPLATE_ID`，再重新部署必要配置。
- [ ] 配置完成后跑真实 smoke：request OTP → 实际收件 → verify → `/me` → StoryDraft create / patch → 跨请求 Session。

### 2. Auth 后续

- [x] 持久 User、Email AuthIdentity、OTP challenge、Session 数据模型。
- [x] Email OTP 登录 / 注册 backend：OTP 哈希、60 秒 resend、失败次数、10 分钟 TTL、90 天 Session。
- [x] Web 第一次登录流程：Email OTP；displayName 可设置也可跳过。
- [x] Story Editor、评论、回复在公开写入前要求登录；点赞触发登录后补做原操作。
- [x] 管理员权限由 `ADMIN_USER_IDS` 稳定 userId allowlist 在 API 层强制执行。
- [x] 改邮箱：旧邮箱 OTP → 当前 Session 绑定的短时 proof → 新邮箱 OTP；成功后保持同一 User、保留当前 Session 并 revoke 其他 sessions；旧邮箱不可访问时不提供绕过验证的自助路径。

## P1：首批真实 Place 与内容生产

### 3. Place 生产

- [x] Place API → viewer runtime → PlayCanvas 投影 → React overlay 动态 pins 正式链路。
- [x] 点击 Place 使用人工保存的完整 camera pose（position / target / fov）。
- [x] Admin Place Console：列表、新建、name / intro / sortOrder、共用 3D Spatial Anchor Editor 标定与重新校准。
- [ ] 先创建约 5 个正式 Place，**若水广场优先做到完整**；随后补图书馆、操场、食堂等公共记忆入口。
- [ ] 为首批 Place 写简短、克制、可长期保留的 intro，并确定展示排序。
- [x] 轻微 ambient focus 运镜：人工镜头 transition 完成后只微调 yaw / pitch / distance；用户输入或关闭 Place 立即取消，`prefers-reduced-motion` 下禁用，“回到最佳视角”可重新进入。

### 4. 首批 Story

- [ ] 准备真实照片与文案，先围绕若水广场生产一组可代表产品气质的 Story。
- [ ] 用真实数据完整跑一次：upload → Draft → submit → review / calibration → publish → Place Feed → Detail → “回到这里”。
- [ ] 再扩到其余首批 Place，至少让每个地点进入时不是空面板。
- [ ] 基于第一批真实内容检查卡片裁切、TextCover、标题 fallback、memoryTime 与图文密度是否仍合理。

## P2：消费体验最后收口

### 5. Place → Story

- [x] Place 顶部完整标题 / intro，下方直接 masonry Published Story feed。
- [x] 下滚后 intro 收缩为 sticky title。
- [x] PC 使用较窄侧边内容层；Mobile 使用可扩展 Bottom Sheet。
- [x] Published Story feed 只使用新 `/api/published-stories` read model。
- [x] 纯文字 Story 使用 TextCover；纯图片 / 无 title Story 使用 fallback display title。
- [x] 同一内容容器内从 Place Feed 打开 Story Detail，并可返回。
- [x] Story Detail 支持多图横滑、作者、memoryTime、正文与地点语义。
- [x] “回到这里”使用 Story custom Anchor 或 Place camera pose 返回 3D。

### 6. Social / Revision / 用户工作区

- [x] Story Like + Comment Like 接持久 User。
- [x] 文字评论 / 回复登录后写入；UI 只保留两层视觉，底层使用 `rootCommentId` + `replyToCommentId`。
- [x] 作者可删除自己的评论；管理员可隐藏 / 恢复评论，隐藏顶层时其回复不公开暴露。
- [x] 已发布 Story 编辑创建新 Revision；审核通过前旧 Published Revision 继续公开。
- [x] 用户可主动下架；删除先 soft delete。
- [x] “我的 Story”显示公开状态与工作状态：草稿 / 审核中 / 待修改 / 未通过 / 已发布 / 已下架。
- [x] Composer 区分智能恢复、新建空白 Story、精确继续指定 Story，支持多草稿。
- [x] 登录用户可跨会话读取自己 Story 的媒体预览；鉴权同时约束 Story ownership 与 revision membership。

## P3：Loading、移动端与发布验收

### 7. Loading

- [x] 并行请求少量 Published Story thumbnail，按真实图片请求完成时用 scale / opacity / blur 生长效果让“记忆先于空间出现”。
- [x] 模型 ready 后立即切入 3D，不强制等待动画；不重启自研 Streamed SOG / progressive splat。
- [x] 新 Story 图片上传时浏览器生成最长边 640px 的 `thumbnail` derivative；Loading 只读 derivative，不 fallback 到原图。

### 8. Mobile / Release Acceptance

- [x] 生产 D1 已按顺序 apply `0002_media_ownership.sql`、`0003_media_derivatives.sql`，remote ledger 与 repo 完全一致后才部署 Worker。
- [ ] 生产环境真实验证改邮箱：当前邮箱收 OTP → 新邮箱收 OTP → 当前 Session 保持 → 其他 Session 失效 → 新邮箱可登录同一 User。
- [ ] iPhone Safari 真机验证 viewport、safe area、横竖屏、Place pins、单指 rotate、双指 pan + pinch zoom、Bottom Sheet 与 3D 手势冲突。
- [ ] 验证 Android Chrome 与 iPad / 触屏核心链路。
- [ ] production acceptance 覆盖 OTP、Draft 恢复、上传、thumbnail derivative、Review、Revision、My Stories、API / 图片 / 模型失败、Like / Comment、返回场景、Pages / Workers / D1 / R2 / 腾讯云 SES。
- [ ] 找少量真实校友做可用性测试，并根据真实行为收敛首屏、Place intro、Story 卡片和投稿阻力。

## 已完成的核心技术闭环

- [x] 根 `pnpm check` + GitHub Actions CI。
- [x] User / SpatialAnchor / Place / Story / StoryRevision / StoryDraft / Comment / Like shared contracts 与 D1 schema。
- [x] Story body/media、<=12 图、单主位置、Draft ownership、media ownership、Published Revision 等关键 invariant。
- [x] StoryDraft create / list / get / patch / submit + autosave / cross-session restore。
- [x] authenticated Story media upload 与 owner-only private media read。
- [x] Place public read / admin authoring API 与 Admin Place Console。
- [x] 共用 3D Spatial Anchor Editor，可供 Story、Review、Place 复用。
- [x] Review backend + Admin Review Console：queue、受保护 media、校准、approve / request changes / reject。
- [x] Published Story public read API，只暴露当前 `publishedRevisionId` 及其媒体。
- [x] Admin Comment Moderation Console。

## Later

- [ ] 多地点 Story；Anchor → Place 晋升机制。
- [ ] QQ / 微信 OAuth、用户主页、收藏、关注、私信、通知中心。
- [ ] 完整 User Ban / RBAC、评论图片和复杂 moderation。
- [ ] Story 搜索、复杂筛选、推荐算法。
- [ ] 校园外围 skyline / 粗模与更精细 X/Z navigation bounds。
- [ ] 更高级 Loading、Streamed SOG / progressive rendering 的重新评估。
- [ ] D1 分页、索引、R2 孤儿对象清理和更完整媒体治理按真实规模补齐。

训练、旧 progressive runtime PoC 和算法筛选已归档；不要放回当前任务池。
