# 项目 Spec

最后更新：`2026-09-13`

## 产品定义

`若水` 是一个以常州老校区为对象的 Web 数字纪念项目：**3D 校园是空间入口，Place / Anchor 是空间定位，Story 是内容最小单位，讨论与点赞构成轻社交。**

它不是“3D 场景旁边挂一个论坛”，也不是先做规模化社区；第一目标是让校友低门槛地重新进入校园空间、发现真实记忆、留下自己的故事，并能从内容自然回到它发生的地方。

## 必须成立

- 浏览器中稳定展示已验收的高质量空中场景；正式生产默认使用完整 Single SOG。
- 用户能从 3D Place / 已发布 Story custom Anchor 发现内容，也能从 Story 回到其 Place / Anchor。
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
- **审核发布后的 custom Anchor 是公共空间入口的一部分**：它应可在 3D 场景被发现，而不是只存在于 Story Detail 的“回到这里”。
- Place 与 Story Anchor 有视觉层级差异；Place 永远高于 Story Anchor，Story Anchor 可按屏幕空间聚合为 cluster。

### Story

- title optional，body optional，media optional，但 body / media 至少一项非空。
- 图片最多 12 张；第一张默认 cover；支持拖拽排序。
- 纯文字 Story 在 Feed 中使用 TextCover；无 title 时从 body 提取展示标题。
- 纯图片且无 title/body 时，可用 `memoryTime + Place` 作为 fallback display title。
- `memoryTime` 是可选的人类可读模糊时间，不把 `createdAt` 当作故事发生时间。
- Story 正文使用普通多行文本，不提供复杂富文本、Markdown 或格式工具栏。

### User / Auth / Profile

- 业务内容只引用稳定 `userId`；email、displayName 和 Profile 字段都不是业务 identity。
- v1 认证方式为 Email OTP，不设密码；email 只是登录 identity。
- `displayName` 是可重复的展示昵称，不引入唯一 username / `@handle`。
- 第一次登录后可提示设置 displayName，但允许跳过并使用默认展示名。
- Profile v1 提供头像、昵称和可选校友身份；账号安全继续提供改邮箱和退出登录。
- 校友身份由用户自述、完全可选，不代表学校认证；字段为入学年份、毕业年份、学院 / 系、专业。没有填写的字段不强制展示。
- Profile 扩展数据与稳定 `users` 主记录分离；头像对象使用当前 user 独立 R2 prefix，确认时必须校验对象归属、存在性和图片类型。
- 进入 Story Editor 前必须登录；评论 / 回复也必须先登录；点赞可以在点击时触发登录并在成功后补做。
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

### Spatial discovery

生产公开空间层统一为：`Place Pin + Published Story Anchor Pin + Story Anchor Cluster`。

- **点击 Place / Story Anchor 只打开内容预览，不自动飞镜头。** Camera focus 必须由用户显式点击“飞到这里”。
- Place Pin 是稳定公共地点，优先级最高，不被 Story cluster 吞掉。
- Story Anchor Pin 更轻量；远景或高密度区域按屏幕距离聚合，避免大量点覆盖场景。
- 点击 cluster 优先 focus / zoom 到该区域并尝试拆分；无法继续拆分时显示“这里有 N 段记忆”的轻预览。
- 旧 Highlight / ForumPost demo 不属于普通用户生产交互；如保留，仅作为 Admin Lab / development 历史实验能力。

### Place → Story

- 点击 Place 后打开当前地点的轻量内容层；**不自动执行 camera transition**。
- Place 内容层直接展示地点名称、intro 与对应 Published Story 预览 / feed；不提供“看点位图文”二次按钮。
- “飞到这里”是显式操作，使用人工保存的完整 camera pose；focus 完成后可进入轻微 ambient 运镜，用户手动操作时立即退出。
- Place 无 Story 时显示自然 empty state，并优先提供“留下故事”，不显示开发占位文案。
- 阅读更多 Story 时在同一容器中从 Glass Peek 过渡 / solidify 为 Paper Content，不再叠第二个 modal。
- PC 使用较窄侧边内容层；移动端使用可扩展 Bottom Sheet。
- Story Detail 在同一内容容器中打开并支持返回；从全局 Story 入口进入时可直接打开 Story。

### Story Anchor → Story

- 点击已发布 custom Anchor 后直接展示 Story 的轻预览：cover / title / author / memoryTime / 短摘要。
- 预览中提供“飞到这里”和“阅读全文”；不存在额外“看图文”按钮。
- “阅读全文”在同一内容容器中进入 Paper Story Detail；“回到这里”使用该 custom Anchor camera pose。

### Global Community

- 普通用户底部 Dock 提供“校园故事”入口，与导览镜头、我的 Story、留下故事并列。
- “校园故事”打开全校园 Published Story Feed / Detail，交互心智可参考成熟图片社区，但仍保留若水的地点语义和设计 contract。
- 全局社区是内容发现补充，不替代 3D 场景中的 Place / Anchor 空间发现。

### Profile / Account

- “我的 Story”中的账号入口进入一个 Focus Sheet；同一容器承载头像、昵称、可选校友身份、登录邮箱和退出登录。
- 更换邮箱在同一 Focus Sheet 内切换验证步骤，不再叠第二层 modal。
- 头像支持上传、更换和恢复默认；头像不是认证凭证，也不影响 `userId`。
- 校友身份不作为权限、审核或认证依据；未来公开用户主页可消费这些字段，但当前不因缺失校友信息限制任何功能。

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
- 内容层按注意力从 Glass Chrome 逐步 solidify 为 Paper Content；不要用弹窗层叠表达层级。
- 背景强弱关系优先通过 surface opacity、dim、排版和对比度建立，避免全屏重 blur。
- 文案克制、温暖，不把页面做成技术 benchmark 面板。
- Story 的空间关系有意义，但允许无位置 Story；不要为了数据整齐强迫用户伪造地点。
- 移动端尊重 safe area、横竖屏和 rotate / pan / pinch zoom 手势。
- Loading v1 只需用少量 Story thumbnail 做真实、轻量的生长 / 淡入等待体验；模型 ready 后立即进入，不追求重工程动画。
- 自研 Streamed SOG、复杂 LOD、外围 skyline / 粗模均不阻塞 Content & Community v1；实验能力只进入 Admin Lab / development。

视觉与交互材质约束以仓库根目录 [`design.md`](../../design.md) 为准；本次产品取舍 rationale 见相关 [`docs/decisions`](../decisions/) 记录。

## 上线成功标准

- 一个真实用户能完成：Email OTP → StoryDraft → Place / Anchor → 提交审核 → 管理员审核 → Published Story。
- 一个真实用户能完成：设置 / 修改昵称与可选校友身份 → 上传 / 更换 / 删除头像 → 更换登录邮箱 → 仍保持同一稳定 User。
- 其他用户能完成：从 3D Place / Story Anchor 发现内容 → Story Detail → Like → Comment → Reply → 回到空间。
- Published custom Anchor 在场景中可发现，并在高密度时通过 cluster 保持可用。
- Published Revision 在新修改审核期间保持稳定可见。
- 桌面端核心链路稳定；iPhone Safari、Android Chrome、iPad / 触屏完成真实设备验收。
- API、模型、媒体和上传失败时都有明确兜底；生产 Pages / Workers / D1 / R2 全链路可复验。
