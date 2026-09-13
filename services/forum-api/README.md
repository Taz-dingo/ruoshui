# forum-api

若水的 Cloudflare Worker 后端。当前正式 Content & Community 主路径使用 **Worker + D1 + R2**；Node/PostgreSQL 只保留明确 fallback / 对照用途。

## 当前职责

- User / Email OTP / Session
- Place / SpatialAnchor public read 与 admin authoring
- Story Draft / Revision / Review / Published Story read model
- Story / Comment Like、Comment / Reply 与 moderation
- authenticated Story media ticket / confirm / private read
- R2 signed object upload 与 public published-media read
- 旧 `/api/forum/*` 仅保留 `HighlightLayer` 仍需要的 **read-only compatibility**

旧 ForumPost 写入、旧 ScenePin 写入、旧 media confirm 和 generic 匿名 upload-ticket issuance 都不再是生产能力。新的公开写入必须经过持久 User 与 Story / Place / Social 的正式 service 边界。

## 本地开发

```bash
pnpm install
cp services/forum-api/.dev.vars.example services/forum-api/.dev.vars
pnpm --filter @ruoshui/forum-api db:migrate:local
pnpm dev:forum-api
```

默认本地地址：`http://127.0.0.1:8787`。

## 主要路由族

- `GET /health`
- `/api/auth/*`
- `/api/places/*`
- `/api/stories/*`
- `/api/published-stories/*`
- `/api/social/*` 与评论 moderation/admin routes
- `GET /api/storage/status`
- `PUT /api/storage/objects/:objectKey` — 只消费正式流程签发的 upload ticket
- `GET /api/forum/*` — legacy read-only compatibility
- `GET /media/*`

Story 上传 ticket 不从 generic `/api/storage/upload-requests` 获取，而由 authenticated Story route 签发。

## 数据库与部署

D1 migrations 位于 `services/forum-api/migrations/`。常用命令：

```bash
pnpm --filter @ruoshui/forum-api db:migrate:local
pnpm --filter @ruoshui/forum-api db:migrations:remote:list
pnpm --filter @ruoshui/forum-api db:migrate:remote
pnpm preflight:forum:prod
pnpm deploy:forum:prod
```

生产 Worker deploy 前必须先通过 `pnpm preflight:forum:prod`；它会只读比对 repo migrations 与远端 `d1_migrations`，有 pending migration 或 history drift 时拒绝部署。部署/排障规则以 `docs/project/engineering-memory.md` 为准，当前事实以 `docs/project/state.md` 为准。
