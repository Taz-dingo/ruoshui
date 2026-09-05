# 项目 Spec

最后更新：`2026-09-06`

## 产品定义

`若水` 是一个以常州老校区为对象的 Web 数字纪念项目：**3D 校园是空间入口，Place / Anchor 是空间定位，Story 是内容最小单位，讨论与点赞构成轻社交。**

它不是“3D 场景旁边挂一个论坛”，也不是先做规模化社区；第一目标是让校友低门槛地重新进入校园空间、留下真实记忆，并围绕具体 Story 继续交流。

## 必须成立

- 浏览器中稳定展示已验收的高质量空中场景；正式生产默认使用完整 Single SOG。
- 用户能从 3D Place 进入地点介绍与 Story，也能从 Story 回到其 Place / Anchor。
- 真实校友能通过 Email OTP 建立持久 User，创建 Story、提交审核，并在 Story 下点赞、评论和回复。
- Story 投稿者自己完成文字、照片和位置录入；管理员主要负责审核、轻量校准与发布，不重新录入。
- Cloudflare Pages + Workers + D1 + R2 提供可维护的页面、API、关系数据和媒体路径。

## 核心实体与约束

### SpatialAnchor / Place

- `SpatialAnchor` 保存 marker position 与 camera pose。
- `Place` 是被命名、公共化的 Anchor，具有名称、简介和人工挑选的最佳镜头。
- Story 可选择一个已有 Place、一个自定义 Anchor，或不绑定位置。
- v1 一个 Story 最多一个主要位置；多地点关联延后。
- 用户提交的自定义 Anchor 在审核前只是 proposed anchor，不直接成为公共 Place。

### Story

- title optional，body optional，media optional，但 body / media 至少一项非空。
- 图片最多 12 张；第一张默认 cover；支持拖拽排序。
- 纯文字 Story 在 Feed 中使用 TextCover；无 title 时从 body 提取展示标题。
- 纯图片且无 title/body 时，可用 `memoryTime + Place` 作为 fallback display title。
- `memoryTime` 是可选的人类可读模糊时间，不把 `createdAt` 当作故事发生时间。
- Story 正文使用普通多行文本，不提供复杂富文本、Markdown 或格式工具栏。

### User / Auth

- 业务内容只引用稳定 `userId`；email 和 displayName 都不是业务 identity。
- v1 认证方式为 Email OTP，不设密码。
- 进入 Story Editor 前必须登录；评论 / 回复也必须先登录；点赞可以在点击时触发登录并在成功后补做。
- 第一次登录后可提示设置 displayName，但允许跳过并使用默认展示名；昵称允许重复。
- Story 与评论 v1 不支持匿名展示。
- 修改邮箱采用旧邮箱 OTP + 新邮箱 OTP；成功后 revoke 其他 sessions。旧邮箱不可访问时由管理员人工处理。
- 管理员由环境变量 `ADMIN_USER_IDS` 的稳定 userId allowlist 产生；完整 RBAC 延后。

### Draft / Review / Revision

- 只有已登录 User 才有 server-side StoryDraft；不维护 anonymous draft。
- 用户产生第一项有意义内容后创建 Draft，并自动保存以支持跨会话恢复。
- 投稿状态至少支持 Draft → Pending Review → Published / Changes Requested / Rejected。
- 管理员可修正轻量元数据、错别字、Anchor / Camera 等明显问题；正文或语义上的实质修改应退回作者。
- 已发布 Story 修改时创建新 Revision；新 Revision 审核通过前旧 Published Revision 继续公开，通过后再原子切换。
- 用户可主动下架；删除先 soft delete，媒体物理清理由后续治理流程处理。

### Social

- Story 和 Comment 都支持 Like。
- 评论 UI 采用“Story 主楼 → 一级评论 → 二级讨论区”的两层视觉结构。
- 二级区内仍可互相回复，但不继续增加缩进；底层保留 `rootCommentId` 与 `replyToCommentId`。
- v1 评论只支持文字；评论隐藏 / 删除属于基础 moderation。
- 暂不实现完整 User Ban；未来如出现持续滥用，再增加禁止评论 / 禁止公开写入等 restriction。

## 核心交互

### Place → Story

- 点击 Place 后镜头过渡到人工保存的 focus camera，并可有轻微 ambient 运镜；用户手动操作时立即退出自动运镜。
- Place 内容层顶部展示地点名称和介绍，下方直接是 Story masonry feed。
- 只有滚到顶部时展示完整介绍；下滚后收缩为 sticky title。
- PC 使用较窄侧边内容层；移动端使用可扩展 Bottom Sheet。
- Story Detail 在同一内容容器中打开并支持返回；从全局 Story 入口进入时可直接打开 Story。

### Story Editor

- 交互心智参考成熟图片内容平台：顶部媒体区、标题、正文、时间、地点、提交审核。
- Place 使用搜索式选择器；自定义 Anchor 进入共用的 3D Anchor Editor，完成“标落点 → 调镜头 → 保存 → 返回 Story Editor”。
- 普通用户和 Admin 尽量复用同一套 Story / Anchor 编辑组件与数据 contract。

### Story Detail

- 多图以横滑为主；Story 下方直接承接 Like、Comment、Reply。
- Feed / Detail 的具体视觉继续遵守根目录 `design.md`，不逐像素复刻任何第三方产品。

## 技术边界

- 前端：React + TypeScript + Vite + Zustand。
- 场景：PlayCanvas Engine API + SOG；正式模型由 R2 经同源 `/edge-models/*` 提供。
- 服务：Hono app core；Workers + D1 为主路径，Node/PostgreSQL 只保留为明确 fallback。
- 媒体：R2；上传必须验证大小、类型、有效期和确认入库。
- 部署：Pages 发布前端壳；重量级模型和媒体不直接打进 Pages 静态产物。
- 普通读取路径不得隐式创建 Scene / Place / Story 等业务数据；初始化和管理写入必须显式发生。

## 体验原则

- 场景是第一屏，UI 不压过纪念空间。
- 文案克制、温暖，不把页面做成技术 benchmark 面板。
- Story 的空间关系有意义，但允许无位置 Story；不要为了数据整齐强迫用户伪造地点。
- 移动端尊重 safe area、横竖屏和 rotate / pan / pinch zoom 手势。
- Loading v1 只需用少量 Story thumbnail 做真实、轻量的生长 / 淡入等待体验；模型 ready 后立即进入，不追求重工程动画。
- 自研 Streamed SOG、复杂 LOD、外围 skyline / 粗模均不阻塞 Content & Community v1。

视觉约束以仓库根目录 [`design.md`](../../design.md) 为准；本次产品取舍的 rationale 见 [`../decisions/2026-09-06-content-community-v1.md`](../decisions/2026-09-06-content-community-v1.md)。

## 上线成功标准

- 一个真实用户能完成：Email OTP → StoryDraft → Place / Anchor → 提交审核 → 管理员审核 → Published Story。
- 其他用户能完成：浏览 Place Story Feed → Story Detail → Like → Comment → Reply → 回到空间。
- Published Revision 在新修改审核期间保持稳定可见。
- 桌面端核心链路稳定；iPhone Safari、Android Chrome、iPad / 触屏完成真实设备验收。
- API、模型、媒体和上传失败时都有明确兜底；生产 Pages / Workers / D1 / R2 全链路可复验。
