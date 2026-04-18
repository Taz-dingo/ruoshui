---
name: ruoshui-react-vercel
description: Use for React, TSX, UI state, async rendering, bundle/performance, and Vite frontend work in 若水广场 `web/`. Trigger when touching `web/src/**/*.tsx`, `web/src/**/*.ts`, `web/vite.config.*`, loading UX, route/view state, or frontend performance. This skill combines the project’s frontend constraints with Vercel React best practices and should usually be paired with `$react-expert`, `$frontend-developer-skill`, and `$writing-typescript`.
---

# Ruoshui React Vercel

Use this skill for `web/` React work, especially when the change affects rendering behavior, perceived loading speed, bundle size, or component/state structure.

## Use Together With

- `$react-expert`
- `$frontend-developer-skill`
- `$writing-typescript`

## Working Rules

1. Preserve the current stack: `React + Vite + Zustand + Tailwind + PlayCanvas/SOG`
2. Default to local component state first; only put cross-panel or runtime-mirroring state into shared stores
3. Keep `PlayCanvas` runtime boundaries clear:
   - rendering/runtime code stays outside presentation components
   - UI panels should consume typed commands or derived state, not reach directly into engine internals
4. Prefer Vercel-style React performance rules:
   - eliminate avoidable async waterfalls
   - start independent async work in parallel
   - use `startTransition`, `useDeferredValue`, and `useEffectEvent` when they truly reduce interaction cost
   - avoid adding `useMemo` / `useCallback` by reflex
5. Prefer directly analyzable imports and lightweight loading paths; do not quietly widen the main bundle
6. For this repo, keep `web/` module exports at the file bottom with unified `export { ... }`

## What Good Output Looks Like

- component boundaries are clearer after the change
- render-critical paths avoid unnecessary effects and duplicate work
- loading, parsing, and interaction feedback improve rather than regress
- new code still fits the existing visual/runtime architecture

## References

- Read [references/vercel-react-notes.md](references/vercel-react-notes.md) when the change touches rendering, async data flow, or bundle/perf decisions
