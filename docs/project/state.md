# 项目状态快照

最后更新：`2026-09-12`

本文件只记录**当前已经成立的事实与尚未成立的事实**。下一步执行顺序见 [`tasks.md`](tasks.md)。

## 当前阶段

若水的 **Content & Community v1 技术闭环已经基本完成**。当前 `main` 已具备正式 User/Auth、Place/SpatialAnchor、Story Draft/Revision/Review、Published Story read model、Place → Story 消费体验、轻社交、作者工作区、ambient focus 与 Story thumbnail loading。生产 Auth / D1 / Worker / Pages 已真实 smoke；项目重心已经从“补产品骨架”转向 **统一 Spatial Discovery、统一材质设计语言、真实内容生产和真实设备验收**。

正式场景继续使用完整 Single SOG，经同源 `/edge-models/hhuc-original.sog` 从 R2 提供。自研 Streamed SOG / LOD 只保留实验入口，不作为当前产品主线。

视觉与交互设计 contract 已统一为：`Scene → Glass Chrome → Paper Content → Focus Sheet`。具体规则见根目录 [`design.md`](../../design.md)，rationale 见 [`2026-09-09-scene-glass-paper-spatial-discovery.md`](../decisions/2026-09-09-scene-glass-paper-spatial-discovery.md)。

## 已经具备

### Viewer / Cloudflare 基础

- `web/`：React + TypeScript + Vite + Zustand + PlayCanvas/SOG viewer。
- 场景基础：镜头预设、小地图、动态 Place pins、加载反馈、按需渲染。
- 手机 3D 交互逻辑：单指 rotate、双指 pan + pinch zoom；逻辑已具备，仍需真机验收。
- Place focus 使用人工保存的完整 camera pose；显式 focus 后可进入极轻 ambient focus，用户 mouse / wheel / touch 输入或关闭 Place 会立即取消，`prefers-reduced-motion` 下禁用。
- 服务主路径：Cloudflare Pages + Workers + D1 + R2；Node/PostgreSQL 仅作明确 fallback。
- Pages `/api/*` 同源代理可透传 Worker response headers，包括 Session cookie。
- 普通用户只使用完整 Single SOG；模型 variant / Streamed SOG / Perf HUD 只在 `?admin=lab` / development 暴露。

### Agent / Gate 基础

- 人机协作长期规则已沉淀到 [`agent-collaboration.md`](agent-collaboration.md)。
- 根 `pnpm check` 统一执行 typecheck + tests + build。
- `.github/workflows/ci.yml` 已在 PR 和 main push 上执行完整 gate。
- `web/scripts/public-ui-contract.test.mjs` 已接入根 `pnpm check`：生产忽略 `?ui=dev` 与历史 localStorage dev 模式；旧 `HighlightLayer` 必须继续只挂在 `?admin=lab`；旧“看点位图文 / 收起图文 / 完整社区”文案不得回流普通用户源码；Place / 单 Story Anchor 打开内容时不得隐式触发 camera focus。
- `web/scripts/visual-check.mjs --dock-hover` 用真实鼠标轨迹断言 dock 菜单 hover 行为（斜向移入面板保持打开、移开关闭），失败时非零退出；需要桌面视口与已运行的前端服务，未接入 CI。
- Story、Auth、Place、Review、Social 等关键 invariant 已被 shared schema / service tests 固化，不再只靠 prose。
- `AGENTS.md` 已要求任何用户可见 UI 改动先读取 `design.md`，并明确属于 Scene / Glass / Paper / Focus Sheet / Admin Lab 中哪一层。

### Content & Community 领域

- shared contracts 已有 User、SpatialAnchor、Place、Story、StoryRevision、StoryDraft、Comment、Like 等正式领域模型。
- v1 Story location 为 Place / custom Anchor / none 三选一；最终提交 body / media 至少一项、图片最多 12 张；Draft 可以不完整。
- D1 schema 已包含 users、auth identities、OTP、sessions、places、stories、revisions、revision media、comments、likes、media ownership 与 media derivatives。
- 生产 `ruoshui-forum` 的 D1 migration ledger 已与 repo 完全一致，包含 `0000` 到 `0003`；`media_asset_derivatives` 表已存在。
- 旧 scene / forum 数据仍为 Admin Lab 的 HighlightLayer 保留只读兼容；`/api/forum/*` 的旧写入、旧 media confirm 与 generic 匿名 upload-ticket issuance 已关闭，正式公开写入只有 User / Story / Place / Social 新主路径。

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

### Spatial Discovery / Place → Story / Social

- 普通用户生产空间层已经不再渲染旧 `HighlightLayer / ForumPost` demo；旧 Highlight 仅在 `?admin=lab` 中可见。
- 普通用户 Dock 已有一级「校园故事」入口，直接打开全校园 Published Story Feed / Detail，不再依赖旧 Highlight 进入完整社区。
- Place Memory Layer 已完成：Place intro + masonry Published Story feed；向下滚动后 intro 收缩为 sticky title。
- **点击 Place 现在只打开 Place 内容，不自动飞镜头；“飞到这里”是显式 camera focus 操作。**
- 已发布 custom Anchor 现在会作为普通用户可发现的 Story Anchor Pin 投影；只读取 Published Story，不读取 draft / pending revision。
- Story Anchor 使用 56px 屏幕空间聚类；Place pin 使用独立投影层，不会被 Story cluster 吞掉。cluster 和单个 Anchor 点击只打开内容，Story Peek 内的「飞到这里」才触发 camera focus。
- Story Anchor Peek 已接入 cover / title / author / memoryTime / 摘要，并提供「飞到这里 / 阅读全文」；Place 空状态提供「留下故事」入口。
- PC 使用窄侧边内容层；Mobile 使用可扩展 Bottom Sheet。
- Story Detail 在同一内容容器内打开并可返回；支持多图横滑、作者、memoryTime、正文与地点语义。
- “回到这里”使用 Story custom Anchor 或 Place camera pose 返回 3D。
- 原“完整社区”入口已切到全校园 Published Story feed / Detail，不再暴露旧 ForumPost composer 或旧 ForumPost read UI。
- Story Like、Comment Like、文字评论 / 回复已接持久 User；公开写入先登录。
- Comment / Reply 底层使用 `rootCommentId` + `replyToCommentId`，UI 只保留两层视觉；作者可删除自己的评论，管理员可隐藏 / 恢复评论。

### Spatial / surface 收口（2026-09-10）

- `PlaceMemoryLayer`、`CommunitySheet`、`MyStoriesPanel`、`StoryComposerFlow`、场景 dock 与通用 Sheet 已迁回 `glassSurfaceClassNames`、`paperSurfaceClassNames`、`focusSurfaceClassNames`；没有新增平行 surface recipe。
- Place / Story 内容容器实现 Glass Peek → Paper Feed 的同容器 solidify transition：`420ms ease-out`；Story Detail 不再在外层容器内叠一层不透明 Paper。
- 当前实际 primitive 参数：Glass capsule `8px`、field/subtle `4px`、panel/popover `8px`；Paper sticky header `4px`；Focus backdrop 不再 blur，dim 仍分别为 `38%` / `30%`。
- Pin command bus 现在会保留最近的 Place / Story Anchor 状态并在 viewer 订阅时回放，避免 React API 请求早于 runtime 订阅而丢点；`pnpm check`、pin replay assertion 均通过，修复以 commit `4db6b67` 推送。

### Loading / media derivatives

- 新 Story 图片上传时浏览器 best-effort 生成最长边 640px 的 `thumbnail` derivative；derivative 与原 media asset 分离存储和授权。
- `media_asset_derivatives` 当前首个 variant 为 `thumbnail`；服务端限制 thumbnail 最大 512 KiB。
- Public thumbnail read 继承当前 published revision 的可见性边界，不会绕过 Story 发布状态。
- Boot loading 会并行请求少量近期 Published Story thumbnail，并在**真实图片请求完成时**以 scale / opacity / blur 生长出现，实现“记忆先于空间出现”。
- Loading 不 fallback 到多 MB 原图；SOG ready 后立即进入 3D，不强制等动画播完。

## 尚未成立 / 仍需真实环境完成

### Spatial Discovery 下一步

- Story Anchor Pin、56px screen-space clustering、Story Anchor Peek 与 Place / Story 不自动飞镜头的代码路径已经部署；公开 API 当前实际返回 1 条 custom-anchor Published Story，Place API 当前返回 0 个 Place。
- 最新生产桌面截图已确认 `1995年在建中的图书馆` Story Anchor Pin 在校园背景中可见；Place API 当前为 0 个 Place，因此没有 Place Pin 属于当前数据事实。仍需人工确认 cluster 拆分手感、Place / Story pin 遮挡优先级和点击后的 Peek 过渡；自动化点击在 WebGL 页面超时，未把这些记为完整视觉验收。

### 材质与视觉层级

- `system.ts` primitive 语义和业务组件迁移已经完成；Story Feed / My Stories / Composer 已降低背景 blur，My Stories / Feed 已去掉主要的卡片套卡片结构。
- Glass → Paper 的 `420ms ease-out` 已部署；Glass 为 `8/4/8px`，Paper sticky 为 `4px`，Sheet / Focus / Loading 全屏遮罩不再使用 backdrop blur。Anchor Pin 已在真实校园背景截图中确认可见，仍需人工验收各层打开与点击时的最终手感。

### 生产 Auth / SES

- `auth.tazdingo.net` 发信域名、发信地址和腾讯云 API Secret 已配置；`AUTH_EMAIL_FROM=no-reply@auth.tazdingo.net`、`AUTH_EMAIL_FROM_NAME=若水`、`TENCENT_SES_REGION=ap-hongkong` 已作为非敏感 Worker vars 配置。
- `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`、`AUTH_OTP_SECRET`、`UPLOAD_SIGNING_SECRET` 已作为 Worker secrets 存在，值不进入 Git。
- 验证码模板 `217132` 已审核通过，并作为非敏感 `TENCENT_SES_TEMPLATE_ID` 配置到 Worker；真实 OTP smoke 结果见生产部署记录。
- 改邮箱虽然代码和自动测试已完成，但还需要生产真实双邮箱 smoke：当前邮箱收到 OTP → 新邮箱收到 OTP → 当前 Session 继续有效 → 其他 Session 失效 → 新邮箱重新登录得到同一 User。

### 生产 migration / deploy

- 生产 D1 `ruoshui-forum` 已先检查 remote migration ledger；`0002_media_ownership.sql`、`0003_media_derivatives.sql` 按顺序安全 apply，ledger 现为 `0000` 到 `0003`，无待迁移。现有数据核对为 `scenes=1`、`media_assets=0`、`derivatives=0`。
- 生产 Worker 当前版本为 `85d40717-b3c0-466e-bb78-688daaceb0c2`；Pages 同源匿名 `/api/auth/me` 已返回 200。
- 生产图片上传 CORS 已修复并部署：`ruoshui.tazdingo.net` 与 `ruoshui-web.pages.dev` 的 OPTIONS 预检均返回对应 `Access-Control-Allow-Origin`，未授权 Origin 不会获得该 header；修复已合并为 PR #45。
- 当前管理员账号的稳定 userId 已配置到生产 Worker 的 `ADMIN_USER_IDS`，审核页权限配置已就绪。
- 生产 smoke 已实际通过：真实 OTP 邮件送达、OTP 登录、跨请求 `/me` Session、StoryDraft create / patch / read、临时 Draft 清理和 logout 全部成功；未创建公开内容。
- 本轮前端修复已部署到 Cloudflare Pages 生产，deployment 为 `8c4f4137-df6b-4ffb-ac73-4ad2bd3ac4a5`（commit `4db6b67`）；`https://ruoshui.tazdingo.net/` 返回 200，线上 bundle 已包含 Pin replay、`story-anchor-cluster` 与 `420ms` transition；生产 API 返回 1 个 Anchor、0 个 Place，真实桌面截图已确认 Anchor Pin 可见。Peek 点击和全屏视觉细节仍因 CUA WebGL 自动化超时未完成。
- 本次部署核对了既有 Worker secrets 名称，未覆盖或输出 secret 值；D1、R2 和非敏感 SES 配置仍在绑定中。

### 真实 Place / Story 内容

- 仍需人工在真实 3D 场景中创建首批正式 Place；若水广场优先，然后补图书馆、操场、食堂等公共记忆入口。
- 每个 Place 的 marker / camera pose / intro / sort order 都应真实人工标定，不允许为了填数据而虚构坐标。
- 仍需准备真实照片和 Story，并完整跑一次 upload → Draft → submit → review / calibration → publish → Place / Anchor spatial discovery → Feed → Detail → 回到这里。
- 只有真实内容进入后，才能最终判断 masonry 裁切、TextCover、标题 fallback、memoryTime 和图文密度是否需要再调。

### Mobile / release acceptance

- iPhone Safari 仍需真机验证 viewport、safe area、横竖屏、Place / Anchor / cluster、单指 rotate、双指 pan + pinch、Bottom Sheet 与 3D 手势冲突。
- Android Chrome、iPad / 触屏仍需核心链路验收。
- production acceptance 仍需覆盖 OTP、改邮箱、Draft 恢复、上传、thumbnail derivative、Review、Revision、My Stories、Like / Comment、API / 图片 / 模型失败、空间返回以及 Pages / Workers / D1 / R2 / 腾讯云 SES 整条链路。
- 仍需找少量真实校友做可用性测试，基于真实行为收敛首屏、Place intro、Story 卡片和投稿阻力。

## 已知限制 / Later

- Node/PostgreSQL fallback 尚未同步所有 Content & Community 新 runtime；当前正式新主路径以 Worker + D1 为准。
- X/Z campus navigation bounds 尚未正式限制；当前主要是 Y、pitch、distance 约束。
- 校园外围 skyline / 粗模保留为未来 polish，不阻塞 v1。
- 多地点 Story、Anchor → Place 晋升、QQ / 微信 OAuth、用户主页、收藏、关注、私信、通知、搜索 / 推荐、完整 RBAC / Ban 等不属于当前 v1 收口范围。
- Streamed SOG / progressive rendering 不在当前任务池；不要因为 Loading 已完成而重新开启这条实验线。

## 当前判断

现在不应继续扩独立功能，而应按 [`tasks.md`](tasks.md) 执行：**Spatial Discovery 统一 + 材质系统落地 + 首批真实 Place / Story + 真机 release acceptance**。

其中 custom Anchor clustering、Glass → Paper 动画、blur / dim 参数和真机手感必须在真实浏览器 / 3D 场景里迭代；纯 GitHub Agent 不应替人拍脑袋定这些视觉参数。

产品边界见 [`spec.md`](spec.md)；视觉 contract 见 [`design.md`](../../design.md)；执行顺序见 [`tasks.md`](tasks.md)；人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)；部署 / 排障规则见 [`engineering-memory.md`](engineering-memory.md)。
