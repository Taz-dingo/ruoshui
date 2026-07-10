---
name: ruoshui-cloudflare-workers
description: Use for Cloudflare Workers, D1, R2, bindings, `wrangler.toml`, migrations, and deployment/runtime config in 若水广场. Trigger when touching `services/forum-api/src/worker.ts`, `services/forum-api/wrangler.toml`, `services/forum-api/migrations/**`, Worker upload flows, D1 repository code, or Cloudflare deployment assumptions.
---

# Ruoshui Cloudflare Workers

Use the official `cloudflare-deploy` skill for deployment commands and current platform guidance. This skill keeps only project-specific rules:

- Treat Worker bindings, `wrangler.toml`, migrations, and binding types as one change.
- Keep shared route contracts runtime-neutral; Worker code must not take hidden Node dependencies.
- D1 changes need migrations and index-aware list/detail queries.
- R2 uploads need explicit type/size verification, stored metadata, and an orphan-cleanup path.
- Heavy viewer assets stay in R2 behind the same-origin proxy, not in Pages artifacts.
- Before deploy/debug work, read `docs/project/engineering-memory.md` for the short, current failure rules.
