# 项目状态快照

最后更新：`2026-09-06`

本文件只记录**当前已经成立的事实与尚未成立的事实**。下一步执行顺序见 [`tasks.md`](tasks.md)。

## 当前阶段

若水已经从“3D viewer + forum PoC”进入 **Content & Community v1** 主线。新的 User/Auth、Place/Anchor、Story Draft/Revision、审核和 Published Story read path 已进入 `main`；当前主要工作转向 Place → Story 的正式消费体验与轻社交。

正式场景继续使用完整 Single SOG，经同源 `/edge-models/hhuc-original.sog` 从 R2 提供。自研 Streamed SOG / LOD 只保留历史实验，不作为当前产品主线。

## 已经具备

### Viewer / Cloudflare 基础

- `web/`：React + TypeScript + Vite + Zustand + PlayCanvas/SOG viewer。
- 场景基础：镜头预设、小地图、热点、加载反馈、按需渲染。
- 手机 3D 交互逻辑：单指 rotate、双指 pan + pinch zoom；仍需真机 polish。
- 服务主路径：Cloudflare Pages + Workers + D1 + R2；Node/PostgreSQL 仅作明确 fallback。
- Pages `/api/*` 同源代理可透传 Worker response headers，包括 Session cookie。

### Agent / Gate 基础

- 人机协作长期规则已沉淀到 [`agent-collaboration.md`](agent-collaboration.md)。
- 根 `pnpm check` 统一执行 typecheck + tests + build。
- `.github/workflows/ci.yml` 已在 PR 和 main push 上执行完整 gate。
- Story 的关键 contract 已被 shared schema / tests 固化，不再只靠 prose。

### Content & Community 领域基础

- shared contracts 已有 User、SpatialAnchor、Place、Story、StoryRevision、StoryDraft、Comment、Like 等新领域模型。
- D1 schema / migration 已加入 users、auth identities、OTP、sessions、places、stories、revisions、revision media、comments、likes。
- `0001_content_community_foundation.sql` 已应用到生产 `ruoshui-forum`，旧 scene 数据仍在。
- v1 Story location 已机械化为 Place / custom Anchor / none 三选一；正文或图片至少一项、图片最多 12 张等提交约束已有测试。

### Auth backend

- Email OTP backend 已完成：邮箱 normalization、随机 6 位 OTP、服务端哈希、60 秒 resend 限制、错误尝试计数、10 分钟有效期。
- 登录成功会创建 / 复用持久 User，并创建只在客户端持有明文的 90 天 Session token；数据库只存 token hash。
- `/api/auth/email/request-otp`、`/verify`、`/me`、`/profile`、`/logout` 已具备。
- 邮件 provider 已从 Cloudflare Email Sending 改为 **腾讯云 SES API 3.0**；Worker 直接使用 `TC3-HMAC-SHA256` 签名调用 `SendEmail`，不再需要 Cloudflare `EMAIL` binding 或仅为 OTP 升级 Workers Paid。
- SES 使用审核模板发送验证码，模板变量只保留 `{{code}}`；当前 OTP 有效期固定 10 分钟，写入模板静态文案。
- 最新 `main`（`4c27bec`）已部署到生产 Worker `ruoshui-forum-api`，版本为 `fc8bf286-6609-46f1-b11e-33c2e054e593`；现有 `AUTH_OTP_SECRET` 与 `UPLOAD_SIGNING_SECRET` 未被覆盖。
- 相关决定和生产配置要求见 [`../decisions/2026-09-06-tencent-ses-auth-email.md`](../decisions/2026-09-06-tencent-ses-auth-email.md)。

### Story 生产与审核

- 登录用户的 Story Draft create / list / get / patch / submit API 已完成。
- Draft 可以是不完整内容；最终 submit 时才强制 body / media 至少一项。
- StoryDraft 与媒体 ownership 在 service / repository 边界执行；用户不能把其他人的 media ID 挂进自己的 Story。
- Web Story Composer 已接真实 Auth / Draft / upload / Place：Email OTP、可跳过 displayName、草稿恢复 / 自动保存、照片上传与排序、Place 选择、提交审核均走正式 API。
- 共用 Spatial Anchor Editor 已接入 Story Composer：正常浏览 3D → 临时落点 → 恢复 3D 操作调镜头 → 保存 Anchor → 回到原 Story 草稿。
- Place read / admin authoring API 已完成；管理员边界由 `ADMIN_USER_IDS` 的稳定 userId allowlist 强制执行。
- Review backend + Admin Review Console 已完成：待审核队列、受保护看图、标题 / 时间 / 地点轻量校准、3D Anchor 重标、通过发布、退回修改、拒绝。
- Review media 只通过管理员受保护 route 读取，不把待审核 R2 对象变成公共 URL。
- Published Story read API 已完成：公开端只读取 Story 当前 `publishedRevisionId`；待审核、拒绝、changes-requested 和被替换 Revision 及其媒体不会经公开 API 暴露。

## 尚未完成的产品 contract

- Place 3D 热点和正式 Place Memory Panel 仍在实现：地点介绍 + masonry Story feed、滚动 sticky title、PC 窄侧边层 / Mobile Bottom Sheet。
- Place focus 要完整使用人工保存的 camera pose，并加入可取消的轻微 ambient 运镜。
- Story Detail 要完成多图横滑、作者 / memoryTime / Place / Anchor、Like / Comment / Reply。
- Story / Comment Like、两层视觉 Comment / Reply 和评论 moderation 尚未接入最终产品 UI。
- 用户主动下架 / soft delete、已发布 Story 的作者侧 Revision 编辑入口仍需收口。
- 改邮箱的旧邮箱 OTP + 新邮箱 OTP 流程尚未实现。

## 当前生产阻塞 / 已知限制

- 生产 Auth 还不能做真实 OTP smoke：代码已经切到腾讯云 SES，但仍需要在腾讯云完成 `auth.tazdingo.net` 发信域名验证、发信地址、验证码模板审核，并给 Worker 配置 `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`、`TENCENT_SES_TEMPLATE_ID`。`AUTH_OTP_SECRET` 已存在。
- `AUTH_EMAIL_FROM=no-reply@auth.tazdingo.net`、`AUTH_EMAIL_FROM_NAME=若水`、`TENCENT_SES_REGION=ap-guangzhou` 已作为非敏感 Worker vars 写入配置；腾讯云 Secret / Template ID 不进入 Git。
- 腾讯云 SES 模板审核通过前不要把 OTP smoke 记为通过。
- 本次部署后从当前终端直连 `workers.dev/health` 仍无法建立连接；Pages 同源旧 forum bootstrap 已返回 200，不能据此替代完整 Auth / Story smoke。
- Node/PostgreSQL fallback 尚未同步新的 Auth / Story service runtime；当前 Content & Community 新主路径以 Worker + D1 为准。
- 当前旧 forum UI / read path 仍保留兼容代码，正在由正式 Place / Story 消费链路逐步替换；不要一次性无意义重写。

## 场景与发布后置项

- X/Z campus navigation bounds 尚未正式限制；当前主要是 Y、pitch、distance 约束。
- 校园外围 skyline / 粗模保留为未来 polish，不阻塞 Content & Community v1。
- Loading 只计划先做轻量 Story thumbnail 生长 / 淡入，不重启 progressive SOG 研发。
- Mobile Safari、Android、iPad / 触屏仍需真实设备验收。

## 当前判断

接下来并行推进两条线：

1. 产品代码：完成 Place → Story 正式阅读体验，再接 Story Detail / Like / Comment / Reply。
2. 生产配置：腾讯云 SES 域名 / 发件地址 / 模板审核通过后，配置 Worker secrets / template id，部署并跑真实 OTP → Session → StoryDraft smoke。

产品边界见 [`spec.md`](spec.md)；执行顺序见 [`tasks.md`](tasks.md)；人机协作规则见 [`agent-collaboration.md`](agent-collaboration.md)；部署 / 排障规则见 [`engineering-memory.md`](engineering-memory.md)。
