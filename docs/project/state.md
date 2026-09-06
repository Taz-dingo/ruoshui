# 项目状态快照

最后更新：`2026-09-06`

本文件只记录**当前已经成立的事实与尚未成立的事实**。下一步执行顺序见 [`tasks.md`](tasks.md)。

## 当前阶段

若水的 **Content & Community v1 代码闭环已经基本完成**。当前 `main` 已具备正式 User/Auth、Place/SpatialAnchor、Story Draft/Revision/Review、Published Story read model、Place → Story 消费体验、轻社交、作者工作区、ambient focus 与 Story thumbnail loading。项目重心已经从“补产品骨架”转向 **生产配置、真实内容生产和真实设备验收**。

正式场景继续使用完整 Single SOG，经同源 `/edge-models/hhuc-original.sog` 从 R2 提供。自研 Streamed SOG / LOD 只保留历史实验，不作为当前产品主线。

## 已经具备

### Viewer / Cloudflare 基础

- `web/`：React + TypeScript + Vite + Zustand + PlayCanvas/SOG viewer。
- 场景基础：镜头预设、小地图、动态 Place pins、加载反馈、按需渲染。
- 手机 3D 交互逻辑：单指 rotate、双指 pan + pinch zoom；逻辑已具备，仍需真机验收。
- Place focus 使用人工保存的完整 camera pose；transition 完成后可进入极轻 ambient focus，用户 mouse / wheel / touch 输入或关闭 Place 会立即取消，`prefers-reduced-motion` 下禁用。
- 服务主路径：Cloudflare Pages + Workers + D1 + R2；Node/PostgreSQL 仅作明确 fallback。
- Pages `/api/*` 同源代理可透传 Worker response headers，包括 Session cookie。

### Agent / Gate 基础

- 人机协作长期规则已沉淀到 [`agent-collaboration.md`](agent-collaboration.md)。
- 根 `pnpm check` 统一执行 typecheck + tests + build。
- `.github/workflows/ci.yml` 已在 PR 和 main push 上执行完整 gate。
- Story、Auth、Place、Review、Social 等关键 invariant 已被 shared schema / service tests 固化，不再只靠 prose。

### Content & Community 领域

- shared contracts 已有 User、SpatialAnchor、Place、Story、StoryRevision、StoryDraft、Comment、Like 等正式领域模型。
- v1 Story location 为 Place / custom Anchor / none 三选一；最终提交 body / media 至少一项、图片最多 12 张；Draft 可以不完整。
- D1 schema 已包含 users、auth identities、OTP、sessions、places、stories、revisions、revision media、comments、likes、media ownership 与 media derivatives。
- `0001_content_community_foundation.sql` 有历史记录表明已应用到生产 `ruoshui-forum`；repo 当前还包含后续 migration，其中 `0003_media_derivatives.sql` 尚未在本状态文件中记录为已应用生产。
- 旧 scene / forum 数据与兼容代码仍保留，正式产品读取路径已转向 Place / Story 新模型。

### Auth / Account

- Email OTP 登录 / 注册 backend 已完成：邮箱 normalization、随机 6 位 OTP、purpose-bound 服务端哈希、60 秒 resend、错误尝试计数、10 分钟 TTL、90 天 Session。
- 登录成功创建 / 复用持久 User；Session 明文 token 只在客户端 cookie，数据库只存 token hash。
- Web 第一次登录已接 Email OTP；displayName 可设置也可跳过。
- 邮件 provider 为 **腾讯云 SES API 3.0**；Worker 使用 `TC3-HMAC-SHA256` 调用 `SendEmail`，模板数据只传 `{ code }`。
- 自助改邮箱代码已完成：旧邮箱 OTP → 当前 User / 当前邮箱 / 当前 Session 绑定的短时 HMAC proof → 新邮箱 OTP → 原 User 的 Email AuthIdentity 改绑；成功后当前 Session 保留、该 User 的其他 Session revoke。
- 改邮箱入口位于 `我的 Story → 账号 → 更换登录邮箱`。旧邮箱不可访问时不提供绕过旧邮箱验证的自助路径。
- 相关腾讯云决定和生产配置要求见 [`../decisions/2026-09-06-tencent-ses-auth-email.md`](../decisions/2026-09-06-tencent-ses-auth-email.md)。

### Story 生产 / 审核 / 作者工作区

- 登录用户的 Story Draft create / list / get / patch / submit API 已完成，并支持跨 Session 恢复和自动保存。
- StoryDraft 与 media ownership 在 service / repository 边界执行；用户不能把其他人的 media ID 挂进自己的 Story。
- Web Story Composer 已接真实 Auth / Draft / upload / Place：照片上传与排序、Place 选择、custom Anchor、提交审核均走正式 API。
- 共用 Spatial Anchor Editor 可供 Story、Review、Place authoring 复用。
- Place public read / admin authoring API 与 Admin Place Console 已完成；管理员边界由 `ADMIN_USER_IDS` 稳定 userId allowlist 强制执行。
- Review backend + Admin Review Console 已完成：待审核队列、受保护 media、标题 / 时间 / 地点轻量校准、3D Anchor 重标、approve / request changes / reject。
- Published Story public API 只暴露当前 `publishedRevisionId`；待审核、拒绝、changes-requested 和被替换 Revision 不会经公开 read model 暴露。
- 作者可以编辑已发布 Story 生成新 Revision；审核完成前旧 published revision 继续公开。
- 作者可以主动下架，删除使用 soft delete；“我的 Story”展示草稿 / 审核中 / 待修改 / 未通过 / 已发布 / 已下架等状态。

### Place → Story 消费与 Social

- Place Memory Layer 已完成：Place intro + masonry Published Story feed；向下滚动后 intro 收缩为 sticky title。
- PC 使用窄侧边内容层；Mobile 使用可扩展 Bottom Sheet。
- Story Detail 在同一内容容器内打开并可返回；支持多图横滑、作者、memoryTime、正文与地点语义。
- “回到这里”使用 Story custom Anchor 或 Place camera pose 返回 3D。
- Story Like、Comment Like、文字评论 / 回复已接持久 User；公开写入先登录。
- Comment / Reply 底层使用 `rootCommentId` + `replyToCommentId`，UI 只保留两层视觉；作者可删除自己的评论，管理员可隐藏 / 恢复评论。

### Loading / media derivatives

- 新 Story 图片上传时浏览器 best-effort 生成最长边 640px 的 `thumbnail` derivative；derivative 与原 media asset 分离存储和授权。
- `media_asset_derivatives` 当前首个 variant 为 `thumbnail`；服务端限制 thumbnail 最大 512 KiB。
- Public thumbnail read 继承当前 published revision 的可见性边界，不会绕过 Story 发布状态。
- Boot loading 会并行请求少量近期 Published Story thumbnail，并在**真实图片请求完成时**以 scale / opacity / blur 生长出现，实现“记忆先于空间出现”。
- Loading 不 fallback 到多 MB 原图；SOG ready 后立即进入 3D，不强制等动画播完。

## 尚未成立 / 仍需真实环境完成

### 生产 Auth / SES

- 腾讯云仍需完成 `auth.tazdingo.net` 发信域名验证、SPF / DKIM、发信地址、OTP 模板审核，并给 Worker 配置 `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`、`TENCENT_SES_TEMPLATE_ID`；Secret 不进入 Git。
- 模板审核 / secrets 配置完成前，不把真实 OTP smoke 记为通过。
- 改邮箱虽然代码和自动测试已完成，但还需要生产真实双邮箱 smoke：当前邮箱收到 OTP → 新邮箱收到 OTP → 当前 Session 继续有效 → 其他 Session 失效 → 新邮箱重新登录得到同一 User。

### 生产 migration / deploy

- `0003_media_derivatives.sql` 需要在生产 D1 明确确认 migration 状态并安全 apply 后，才能部署依赖 derivative 表的 Worker 版本。
- 本文件没有证据表明最新 `main` 已部署生产；不要因为 GitHub merge / CI green 就写成生产已更新。
- 历史上已验证过一次生产 Worker 部署：当时 `main` 为 `4c27bec`、Worker version 为 `fc8bf286-6609-46f1-b11e-33c2e054e593`。这只是历史生产基线，不代表当前 `main` 已上线。
- 现有 `AUTH_OTP_SECRET` 与 `UPLOAD_SIGNING_SECRET` 有历史记录表明已存在；部署新版本时不得覆盖或输出这些 Secret。

### 真实 Place / Story 内容

- 仍需人工在真实 3D 场景中创建首批正式 Place；若水广场优先，然后补图书馆、操场、食堂等公共记忆入口。
- 每个 Place 的 marker / camera pose / intro / sort order 都应真实人工标定，不允许为了填数据而虚构坐标。
- 仍需准备真实照片和 Story，并完整跑一次 upload → Draft → submit → review / calibration → publish → Place Feed → Detail → 回到这里。
- 只有真实内容进入后，才能最终判断 masonry 裁切、TextCover、标题 fallback、memoryTime 和图文密度是否需要再调。

### Mobile / release acceptance

- iPhone Safari 仍需真机验证 viewport、safe area、横竖屏、Place pins、单指 rotate、双指 pan + pinch、Bottom Sheet 与 3D 手势冲突。
- Android Chrome、iPad / 触屏仍需核心链路验收。
- production acceptance 仍需覆盖 OTP、改邮箱、Draft 恢复、上传、thumbnail derivative、Review、Revision、My Stories、Like / Comment、API / 图片 / 模型失败、返回场景以及 Pages / Workers / D1 / R2 / 腾讯云 SES 整条链路。
- 仍需找少量真实校友做可用性测试，基于真实行为收敛首屏、Place intro、Story 卡片和投稿阻力。

## 已知限制 / Later

- Node/PostgreSQL fallback 尚未同步所有 Content & Community 新 runtime；当前正式新主路径以 Worker + D1 为准。
- X/Z campus navigation bounds 尚未正式限制；当前主要是 Y、pitch、distance 约束。
- 校园外围 skyline / 粗模保留为未来 polish，不阻塞 v1。
- 多地点 Story、Anchor → Place 晋升、QQ / 微信 OAuth、用户主页、收藏、关注、私信、通知、搜索 / 推荐、完整 RBAC / Ban 等不属于当前 v1 收口范围。
- Streamed SOG / progressive rendering 不在当前任务池；不要因为 Loading 已完成而重新开启这条实验线。

## 当前判断

现在不应继续无目的扩产品功能。下一阶段按 [`tasks.md`](tasks.md) 执行：**生产 SES / migration / deploy smoke + 首批真实 Place / Story + 真机 release acceptance**。只有真实链路暴露问题时，再做针对性代码修正。

产品边界见 [`spec.md`](spec.md)；执行顺序见 [`tasks.md`](tasks.md)；人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)；部署 / 排障规则见 [`engineering-memory.md`](engineering-memory.md)。
