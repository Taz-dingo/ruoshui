# Mcollina Node Notes

Source focus:

- Matteo Collina skills repo:
  [mcollina/skills](https://github.com/mcollina/skills)
- Matteo Collina Node skill:
  [mcollina/skills `skills/node/SKILL.md`](https://github.com/mcollina/skills/blob/main/skills/node/SKILL.md)
- Node official docs:
  [Don’t block the event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
  [Security best practices](https://nodejs.org/en/learn/getting-started/security-best-practices)

Use these heuristics in 若水广场 backend work:

1. Keep async work explicit and parallelize only independent operations.
2. Treat environment parsing, error taxonomy, and shutdown flow as first-class backend design, not cleanup chores.
3. Prefer stable interfaces between route handlers, repositories, and runtime adapters.
4. Avoid hidden module state for request-specific data.
5. Prefer backpressure-aware stream patterns and avoid buffering whole payloads unless the payload is intentionally small.
6. Guard security-sensitive defaults:
   - validate input early
   - keep secrets in env/bindings
   - avoid over-broad CORS or implicit trust
7. In this repo specifically, shared backend code must stay compatible with both Node fallback and Cloudflare adapter layers.
