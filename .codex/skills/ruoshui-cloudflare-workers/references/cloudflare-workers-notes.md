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

## Deployment Lessons Learned

These are project-specific Cloudflare lessons that should be treated as part of the default workflow until the platform setup changes.

### 1. `wrangler` transport can fail even when the config is correct

- Symptom:
  - `wrangler deploy`
  - `wrangler pages deploy`
  - `wrangler r2 object put --remote`
  may fail with generic `fetch failed`
- Working assumption:
  - do not immediately conclude that Worker, Pages, or `R2` resources are misconfigured
- Preferred fallback path:
  - verify account/session with `wrangler whoami`
  - if needed, switch to Cloudflare API or MCP-based operations for settings, uploads, or deploy inspection

### 2. Raw API scripts may need a refreshed Wrangler OAuth token

- Symptom:
  - local API scripts start returning auth failures or upload-token failures even though the account was logged in before
- Fix:
  - run `wrangler whoami` to refresh the local session before retrying the raw API flow
- Repo-specific note:
  - local scripts may read the token from `~/Library/Preferences/.wrangler/config/default.toml`

### 3. Pages is not the place for heavy `.sog` assets

- Hard rule:
  - treat `25 MiB` per-file as a hard Pages limit for production packaging
- Example already seen in this repo:
  - `hhuc-original.sog` exceeded the Pages file limit and had to move to `R2`
- Default release pattern:
  - keep the frontend build lightweight
  - publish heavy viewer data from `R2`
  - rewrite production metadata to the public `R2` URL during the deploy build step

### 4. `R2` public delivery may require a managed domain step

- Do not assume bucket objects are immediately public
- If the release path depends on direct browser access, verify or enable the `R2` managed public domain for the bucket
- Record the public base URL explicitly in config after the domain is enabled
- Do not assume a managed public domain will also satisfy browser CORS requirements
- If frontend code fetches the object directly from `r2.dev`, configure bucket CORS explicitly or the browser may still block the request

### 5. Pages asset MIME types must be explicit

- Symptom:
  - `https://...pages.dev` opens blank or downloads `index.html`
- Likely cause:
  - upload script fell back to `application/octet-stream` for `.html`
- Prevention:
  - always map content types explicitly for `.html`, `.css`, `.js`, and other shipped asset types in any raw Pages asset upload flow

### 6. Wrong Pages asset metadata can survive if the hash stays the same

- Symptom:
  - redeploy succeeded but the page still behaves like the old broken asset
- Cause:
  - Pages asset storage keys are content-addressed; unchanged file content can reuse the earlier bad metadata path
- Fix:
  - force a content change for the affected file before redeploying when repairing metadata-sensitive assets such as `index.html`

### 7. Local access to `workers.dev` may be misleading

- In this project environment, local `curl` access to `*.workers.dev` was unreliable
- Rule:
  - do not use one local network path as the only health signal
  - cross-check via Cloudflare dashboard/API, deployment status, or a same-origin Pages proxy path

### 8. Pages Functions are the preferred production bridge for this repo

- Keep same-origin `/api/*` proxying available when the frontend is on Pages and the backend is on Workers
- Use that bridge both for user-facing API access and for visible production health signals
- For oversized viewer models, prefer a same-origin Pages proxy path over direct browser fetches to `r2.dev`; this avoids coupling the MVP viewer to cross-origin behavior

### 9. Worker settings patching may require multipart form-data

- Symptom:
  - JSON patch request is rejected with a content-type error
- Fix:
  - send Worker settings updates as `multipart/form-data` with a `settings` part when using the Cloudflare API path
