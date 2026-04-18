---
name: ruoshui-node-mcollina
description: Use for Node.js, TypeScript, server architecture, async IO, error handling, environment configuration, and backend shared contract work in 若水广场. Trigger when touching `services/forum-api/**`, `packages/shared/**`, Node-side scripts, backend runtime adapters, or server validation/error handling. This skill combines Matteo Collina’s Node best-practice skill with Node official guidance and should usually be paired with `$writing-typescript`.
---

# Ruoshui Node Mcollina

Use this skill for Node-side implementation and review, especially when backend code structure or runtime behavior may drift into browser-only or platform-specific assumptions.

## Use Together With

- `$writing-typescript`

## Working Rules

1. Keep runtime-specific code isolated:
   - Node fallback code stays in Node adapters
   - Worker code stays in Worker adapters
   - shared contracts stay runtime-neutral
2. Favor explicit async boundaries and typed errors over hidden global state
3. Avoid sync filesystem or heavyweight startup work in request paths
4. Keep environment parsing and defaults centralized
5. For stream or large-payload code, prefer backpressure-aware patterns instead of ad hoc buffering
6. Keep shutdown, cleanup, and connection lifecycle explicit in Node-only entrypoints
7. When writing shared backend code, do not accidentally rely on Node-only globals or modules unless the file is clearly Node-specific
8. If a workspace dependency exports runtime code from ignored `dist/` output, make dependent `dev` and `build` scripts refresh that package before boot so local runtime code does not drift behind shared source

## What Good Output Looks Like

- backend modules have clear IO boundaries
- errors are typed and operationally understandable
- shared code can move between Node fallback and Worker runtime without hidden breakage
- environment and resource lifecycle are easy to trace

## References

- Read [references/mcollina-node-notes.md](references/mcollina-node-notes.md) when changing backend flow, environment handling, streams, or error boundaries
