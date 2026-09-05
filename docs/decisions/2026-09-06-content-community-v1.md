# Content & Community v1

状态：`Accepted`

日期：`2026-09-06`

## Context

若水已经具备 3D viewer、热点、社区 feed/detail/compose、多图、Workers + D1 + R2 等技术骨架，但原有“论坛 / 点位 / 笔记”仍主要是技术 PoC。下一阶段需要把它收束成一个真正的校园记忆产品，并建立可长期演进的 User / Story / Place / 评论关系。

产品目标不是做“3D 校园 + 通用论坛”，而是做**可以走进去的校园记忆地图**：空间是入口，地点承载公共记忆，Story 是内容最小单位，轻社交让校友继续补充讨论。

## Decision

### 空间模型

- `SpatialAnchor` 是最底层空间信息：marker position + camera pose。
- `Place` 是被命名和公共化的 Anchor，具有名称、简介和人工挑选的最佳镜头。
- Story 可以绑定一个已有 Place，也可以拥有一个自定义 Anchor，或不绑定位置。
- v1 一个 Story 最多一个主要位置；多地点关联保留为未来能力。
- 自定义 Anchor 由用户在 3D 中完成“标落点 → 调整视角 → 保存”，投稿时保存为 proposed anchor，管理员只做审核 / 校准。

### Place 与 Story 浏览

- 从 3D 点击 Place 后，镜头过渡到人工保存的 focus camera，并允许轻微 ambient 运镜；用户手动操作时立即退出自动运镜。
- Place 内容层顶部是地点名称和介绍，下方直接是 Story masonry feed。
- 只有滚到顶部时展示完整地点介绍；下滚后收缩成 sticky title，减少内容层占用。
- PC 使用较窄侧边内容层；手机使用可扩展 Bottom Sheet。
- 点击 Story 在同一内容容器中进入 Story Detail，并支持返回 Place feed；从全局 Story 入口进入时可以直接打开 Story。

### Story

- title optional；body optional；media optional，但 body / media 至少一项非空。
- 图片最多 12 张，第一张默认 cover，支持拖拽排序。
- 纯文字 Story 在 Feed 中渲染 TextCover，不要求真的生成图片；无 title 时从正文提取展示标题。
- 纯图片且无 title/body 时，可用 `memoryTime + Place` 生成 fallback display title。
- `memoryTime` 是可选的人类可读模糊时间，例如“2022 年秋”“毕业前一晚”，不把 createdAt 当作故事时间。
- 编辑器使用普通多行文本，不做复杂富文本、Markdown、粗体和结构化排版工具。

### Auth / User

- 从 v1 开始使用持久 `User`，业务内容只引用稳定 `userId`，不引用邮箱或昵称作为 identity。
- 第一种认证方式为 Email OTP；不设密码。
- Story 投稿进入 Editor 前必须登录；评论 / 回复也必须先登录；点赞可在点击时触发登录并在成功后补做原操作。
- 第一次登录后可以提示设置 displayName，但允许跳过并使用系统默认展示名；昵称允许重复。
- Story 与评论暂不支持匿名展示。
- 修改邮箱采用旧邮箱 OTP + 新邮箱 OTP 双验证；成功后 revoke 其他 sessions。旧邮箱不可访问时 v1 由管理员人工处理。
- 管理员通过环境变量中的稳定 `ADMIN_USER_IDS` allowlist 产生；暂不引入完整 RBAC。

### Draft / Review / Revision

- 不存在匿名 server-side StoryDraft；只有登录用户才有 StoryDraft。
- 用户产生第一项有意义内容后创建 Draft，并自动保存，以支持跨会话恢复。
- 投稿流程为 Draft → Pending Review → Published / Changes Requested / Rejected。
- 管理员可以修正轻量元数据、错别字、Anchor / Camera 等明显问题；正文或语义上的实质修改应退回作者。
- 已发布 Story 修改时创建新的 Revision；旧 Published Revision 在新 Revision 审核通过前继续公开，审核通过后原子切换。
- 用户可以主动下架；删除先 soft delete，媒体物理清理由后续治理流程处理。

### Social

- Story 和 Comment 都支持 Like。
- 评论 UI 采用“主楼 Story → 一级评论 → 二级讨论区”的两层视觉结构。
- 二级区内仍可互相回复，但不继续增加缩进；底层保留 `rootCommentId` 与 `replyToCommentId`，UI 用“回复某人”表达深层关系。
- v1 评论只支持文字，不做评论图片、私信、关注、等级等完整论坛能力。
- v1 不先实现完整用户封禁体系；提供评论隐藏 / 删除等 moderation 能力。未来如出现持续滥用，再增加禁止评论 / 禁止公开写入等 User restriction；历史内容默认不因账号限制而自动消失。

### Loading / Scene delivery

- Production 继续使用完整 Single SOG；不再自行投入 Streamed SOG / 自研 LOD pipeline。
- 保留高质量源资产，未来若 PlayCanvas / 上游工具能稳定自动生成更好的 streamed 版本，再重新评估。
- Loading v1 只做 80 分方案：并行加载少量 Story thumbnail，让照片以简单生长 / 淡入方式出现；模型 ready 后自然切入 3D，不为了完整播放动画故意延迟。
- 校园外围 skyline / 粗模和 X/Z navigation bounds 后置，不阻塞 Content & Community v1。

## Invariants

- 正常阅读路径不得隐式创建 Scene / Place / Story 等业务数据。
- Story 的公开写入必须绑定正式 User。
- v1 一个 Story 最多一个位置。
- Story body / media 至少一个非空，media 最多 12。
- 未审核的新 Revision 不得替换当前 Published Revision。
- 用户提交的自定义 Anchor 不直接成为公共 Place；发布前必须经过审核 / 校准。
- 权限约束必须在服务端真实边界执行，不能只依赖前端隐藏入口。

## Alternatives considered

### 通用论坛作为产品中心

拒绝。论坛会把空间变成附属背景；若水的主轴应是“空间 → 地点 → Story → 回到空间”，社交只围绕 Story 补充。

### 每个个人小角落都创建 Place

拒绝。会让地点库快速碎片化。个人记忆先使用 Story Anchor；有公共价值时再人工晋升为 Place。

### 匿名投稿 / 匿名评论先上线，以后再迁正式账号

拒绝。会产生内容归属、claim、修改与迁移债。v1 直接建立持久 User，Email OTP 只是第一种 identity provider。

### 投稿先写完，提交时再登录

拒绝。既然最终必须登录，Story 属于重内容，进入 Editor 前登录更坦诚，也避免 anonymous draft / edit token / TTL 等额外状态系统。

### 富文本 Story Editor

拒绝。故事以照片、自然段文字和地点为核心，复杂格式增加 UI 与内容治理成本而没有明显价值。

### 自研 Streamed SOG / progressive splat

当前拒绝。已有实验投入与产品收益不匹配，且不会阻塞核心叙事；继续使用 Single SOG，把研发投入转向内容闭环。

## Consequences

- 原 `forum` 技术骨架可以逐步迁移而无需立即重命名所有内部代码，但前台产品语义从“论坛 / 笔记”收束为 Place / Story / Discussion。
- 数据模型需要一次较大的重构：User/Auth、StoryDraft/Revision、Place/Anchor、Like/Comment/Reply、Review 状态都会进入主路径。
- Story Editor、Anchor Editor 和 Admin Review 应尽量复用同一套组件与数据 contract，避免“用户投稿一套、管理员重录一套”。
- 由于业务 contract 已经稳定，下一阶段应优先将关键 invariant 机械化，而不是继续依赖文档提醒。

## Deferred work

- 多地点 Story。
- Story Anchor 自动 / 半自动晋升 Place。
- QQ / 微信 OAuth。
- 用户主页、收藏、关注、私信、通知中心。
- 完整 User Ban / RBAC。
- 评论图片。
- Story 搜索、复杂筛选、推荐算法。
- 校园外围粗模、skyline、精细 navigation bounds。
- Streamed SOG / progressive rendering 的重新评估。
