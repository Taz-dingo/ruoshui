# Cloudflare Workers Notes

Source focus:

- Cloudflare official Hono on Workers guide:
  [Hono on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/hono/)
- Cloudflare D1 docs:
  [D1 best practices](https://developers.cloudflare.com/d1/best-practices/)
- Cloudflare R2 docs:
  [R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)

Use these heuristics in 若水广场 Cloudflare work:

1. Keep Worker bindings typed and centralized so runtime assumptions are visible.
2. Keep `D1` schema changes and application code in the same iteration; do not let migration drift accumulate.
3. Design query shape with pagination and indexes in mind before building feed/list APIs.
4. Prefer Worker-native request handling and platform APIs over Node polyfills.
5. Keep `R2` upload validation explicit:
   - verify size
   - verify type
   - verify expiry/signature
6. Distinguish clearly between local `wrangler dev --local` assumptions and deploy-time bindings.
7. In this repo, Cloudflare work should preserve the fallback Node path but treat Worker runtime as the default new path.
