# 项目状态快照

最后更新：`2026-09-06`

本文件只记录**当前已经成立的事实与尚未成立的事实**。下一步执行顺序见 [`tasks.md`](tasks.md)。

## 当前阶段

若水已经完成底层 3D / Cloudflare / 旧社区技术骨架，并完成 Content & Community v1 的主要产品决策。第一轮工程基础也已经进入 `main`：仓库开始从“3D viewer + forum PoC”迁移到**空间 → Place / Anchor → Story → 讨论 → 回到空间**的校园记忆产品。

正式场景继续使用完整 Single SOG，经同源 `/edge-models/hhuc-original.sog` 从 R2 提供。自研 Streamed SOG / LOD 只保留历史实验，不作为当前产品主线。

## 已经具备

### Viewer / Cloudflare 基础

- `web/`：React + TypeScript + Vite + Zustand + PlayCanvas/SOG viewer。
- 场景基础：镜头预设、小地图、热点、加载反馈、按需渲染。
- 手机 3D 交互逻辑：单指 rotate、双指 pan + pinch zoom；仍需真机 polish。
- 服务主路径：Cloudflare Pages + Workers + D1 + R2；Node/PostgreSQL 仅作明确 fallback。
- Pages `/api/*` 同源代理可透传 Worker response headers，包括后续 Session cookie。

### Agent / Gate 基础

- 人机协作长期规则已沉淀到 [`agent-collaboration.md`](agent-collaboration.md)；产品 rationale 见 [`../decisions/2026-09-06-content-community-v1.md`](../decisions/2026-09-06-content-community-v1.md)。
- 根 `pnpm check` 已统一执行 typecheck + tests + build。
- `.github/workflows/ci.yml` 已在 PR 和 main push 上执行完整 gate；当前 main CI 为 green。
- Story 的第一批关键 contract 已被 shared schema / tests 固化，不再只靠 prose。

### Content & Community 新领域基础

- shared contracts 已有 User、SpatialAnchor、Place、Story、StoryRevision、StoryDraft、Comment、Like 等新领域模型。
- D1 与 Postgres schema 已加入 users / auth identities / OTP / sessions / places / stories / revisions / revision media / comments / likes。
- D1 migration `0001_content_community_foundation.sql` 已于 `2026-09-05` 应用到生产 `ruoshui-forum`（database id `77f54654-bb08-41b4-afb4-cfd1c3669a26`）；远端 `d1_migrations` 已确认同时记录 `0000_initial.sql` 与 `0001_content_community_foundation.sql`，旧 scene 数据仍在。
- v1 Story location 已机械化为 Place / custom Anchor / none 三选一；正文或图片至少一项、图片最多 12 张等提交约束已有测试。

### Auth backend

- Email OTP backend 已完成：邮箱 normalization、随机 6 位 OTP、服务端哈希、60 秒 resend 限制、错误尝试计数、10 分钟有效期。
- 登录成功会创建 / 复用持久 User，并创建只在客户端持有明文的 90 天 Session token；数据库只存 token hash。
- `/api/auth/email/request-otp`、`/verify`、`/me`、`/profile`、`/logout` 已具备。
- Worker 已支持可选 Cloudflare Email Service adapter；只有 `EMAIL` binding + `AUTH_EMAIL_FROM` + `AUTH_OTP_SECRET` 都存在时才启用 auth routes，因此当前代码可以安全上线而不会伪造邮件配置。
- 生产 Worker `ruoshui-forum-api` 已部署版本 `8967ac3f-7c0b-4785-a200-2fbad68c43a7`；`AUTH_OTP_SECRET` 已通过 Wrangler Secret 设置，既有 `UPLOAD_SIGNING_SECRET`、D1、R2 和 vars 均仍在部署 binding 清单中。

### Story Draft backend

- 已完成登录用户的 Story Draft create / list / get / patch / submit API。
- Draft 可以是不完整内容；最终 submit 时才强制 body / media 至少一项。
- StoryDraft 归属检查在 service / repository 边界执行，其他 User 无法读取或编辑。
- submit 前会验证引用的 media asset 均为 ready。
- `changes_requested` Revision 可以继续编辑，编辑后回到 `draft`；提交后进入 `pending_review`。

## 已确定但尚未完成的产品 contract

- `Place` 要拥有人工维护的 focus camera；当前旧 pin focus 仍用统一 offset 临时计算。
- Place 内容层要改成地点介绍 + masonry Story feed，并在滚动后收缩为 sticky title。
- PC 最终用窄侧边内容层，Mobile 用可扩展 Bottom Sheet。
- Story Editor 要采用简单图片内容 Composer：媒体排序、optional title、普通 textarea、memoryTime、Place / Anchor、自动保存。
- 普通用户和 Admin 要复用同一个 3D Anchor Editor。
- Review backend / Admin UI、Published Revision 原子切换、主动下架 / soft delete 尚未实现。
- Story Detail、Like、Comment、Reply 的新产品 UI / API 尚未实现。

## 当前实现差距 / 已知限制

- 生产 Auth **尚未启用**：`AUTH_OTP_SECRET` 和 D1 migration 已完成，但账号当前没有任何 Cloudflare zone，故无法配置可验证的 Email Sending sender/domain、`EMAIL` binding、`AUTH_EMAIL_FROM` / `AUTH_EMAIL_FROM_NAME`；Pages 同源 OTP 请求实际返回 404。需要先由人工在该账号添加并激活自有域名、启用 Email Sending、发布 Cloudflare 要求的 DNS 记录，然后提供真实发件地址/显示名再部署。
- 本次生产 smoke 已验证 Pages 同源 `/api/forum/bootstrap` 返回 200；直接 `workers.dev/health` 在当前终端网络中超时，不能记为 health 通过。OTP 邮件、OTP 登录、`/api/auth/me`、StoryDraft 创建/修改和跨请求 session 因 Auth 未启用尚未执行。
- 改邮箱的双 OTP 流程和 `ADMIN_USER_IDS` 服务端权限检查尚未实现。
- Web 前端仍是旧 `CommunitySheet` 的“社区笔记 / 推荐流 / 写笔记”PoC；新 Auth / StoryDraft backend 还没有接入 UI。
- 当前正常社区 refresh 仍调用 `ensureCommunityScene()`，存在读取路径隐式写业务数据的问题；必须在替换旧社区壳时移除。
- 旧 storage / media confirm API 还没有绑定正式 User / Draft ownership；在开放新 Story Editor 前需要收口，否则 media ID 归属边界不够严格。
- Place read / authoring API、真实 Place 和真实 Story 尚未正式落库。
- Node/PostgreSQL fallback 还没有同步新 Auth / Story service runtime；当前新主路径只接 Worker + D1。

## 场景与发布后置项

- X/Z campus navigation bounds 尚未正式限制；当前主要是 Y、pitch、distance 约束。
- 校园外围 skyline / 粗模保留为未来 polish，不阻塞 Content & Community v1。
- Loading 只计划先做轻量 Story thumbnail 生长 / 淡入，不重启 progressive SOG 研发。
- Mobile Safari、Android、iPad / 触屏仍需真实设备验收。

## 当前判断

P0 的 repository gate、新领域 schema、Email OTP backend、StoryDraft backend 已经成立。下一步应集中做**可见的内容生产链路**：

1. 收口 authenticated media upload ownership；
2. 建 Place read / authoring 与共用 Anchor Editor；
3. 接入 Web Login + Story Editor + server-side Draft autosave；
4. 再做 Review / Revision publish 和新的 Place Feed / Story Detail / Social。

产品边界见 [`spec.md`](spec.md)；执行顺序见 [`tasks.md`](tasks.md)；人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)；部署 / 排障规则见 [`engineering-memory.md`](engineering-memory.md)。
