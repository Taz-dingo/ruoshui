---
name: ruoshui-cloudflare-workers
description: Use for Cloudflare Workers, D1, R2, bindings, `wrangler.toml`, migrations, and deployment/runtime config in 若水广场. Trigger when touching `services/forum-api/src/worker.ts`, `services/forum-api/wrangler.toml`, `services/forum-api/migrations/**`, Worker upload flows, D1 repository code, or Cloudflare deployment assumptions.
---

# Ruoshui Cloudflare Workers

Use this skill whenever the task touches the Cloudflare deployment path or any code that depends on Worker runtime bindings.

## Working Rules

1. Treat Worker bindings as typed infrastructure, not loose string config
2. Keep the app core dependency-injected so the same route contract can mount on both Worker and Node fallback entrypoints
3. Keep `wrangler.toml`, migration files, repository assumptions, and env/binding types in sync
4. Prefer Worker-native APIs and assumptions; do not quietly pull Node-only helpers into Worker-shared code
5. For `D1`:
   - run migrations before relying on schema changes
   - keep list/detail queries index-aware
   - design pagination and read patterns early
6. For `R2`:
   - keep upload verification explicit
   - store enough metadata to confirm uploads and clean orphaned objects later
7. Prefer small, reversible infra steps; land local migration/dev proof before expanding product scope
8. When a Cloudflare deploy/debug step reveals a reusable pitfall, append it to `docs/project/engineering-memory.md` before the next commit-sized delivery
9. If the pitfall changes the default Cloudflare workflow, also update this skill or its references in the same iteration instead of leaving the lesson only in thread history

## Known Pitfalls

Use [references/cloudflare-workers-notes.md](references/cloudflare-workers-notes.md) for the full checklist. The current repo has already learned these concrete lessons:

- `wrangler` CLI transport can fail with generic `fetch failed` errors even when auth is valid; keep Cloudflare API and MCP fallback paths ready before assuming the resource is broken
- `R2` large model assets should not be shipped inside Pages artifacts; treat `25 MiB` per-file as a hard release gate and move heavy viewer assets to `R2`
- Pages asset uploads must set explicit MIME types for `.html`, `.css`, `.js`, and other web assets; a wrong `index.html` content type can make the browser download the page instead of rendering it
- If a bad Pages asset reused the same content hash, force a new hash before redeploying or the wrong metadata may survive
- In this repo and network environment, do not treat failed local `curl` access to `*.workers.dev` as definitive proof that the deployment itself is down

## What Good Output Looks Like

- Worker entry, bindings, and repositories line up cleanly
- migrations and code changes are introduced in the same iteration
- Cloudflare-specific code is explicit, typed, and easy to reason about
- later deployment and rollback steps stay tractable

## References

- Read [references/cloudflare-workers-notes.md](references/cloudflare-workers-notes.md) when changing Worker runtime, D1, R2, or `wrangler` config
