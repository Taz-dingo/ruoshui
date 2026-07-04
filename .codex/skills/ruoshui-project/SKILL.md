---
name: ruoshui-project
description: Use when planning, scoping, documenting, saving progress, preparing a handoff, or implementing the 若水广场 repo. Keeps business development aligned with current product boundaries and delivery rules.
---

# Ruoshui Project

## Current Product Boundaries

- `若水广场` is a Web-first digital memorial for the old Changzhou campus.
- The accepted `SOG` scene is the product foundation; training is finished and archived.
- Current work is viewer quality, real story points, community notes, and Cloudflare delivery.
- Desktop stays primary; mobile compatibility should remain practical.
- Login, moderation, open UGC, CMS, and new renderer research are deferred.

## Minimal Default Context

Start narrow, then expand only when the task needs it:

1. Read `docs/project/state.md` first. It is the only default entry.
2. Read `docs/project/tasks.md` only for next-step or priority questions.
3. Read `README.md`, `docs/project/spec.md`, or `docs/project/plan.md` only when scope or roadmap is unclear.
4. Read `docs/project/engineering-memory.md` only for deploy/debug/validation pitfalls.
5. Read focused docs under `docs/project/**` only for the affected area.
6. Never read `docs/archive/**` unless the task is explicitly historical.

## Working Rules

1. Start from verified repo state and the smallest active docs layer that answers the task.
2. Keep each iteration focused, testable, and commit-sized.
3. Use `$ruoshui-doc-sync` for document destinations, handoffs, and state/task/memory synchronization.
4. Use `$ruoshui-cleanup` before every commit-sized delivery.
5. Use dedicated branches and prefer a reviewed PR after a coherent step.
6. Do one overall review and validation pass before opening or merging a PR.
7. Do not mix unrelated frontend, backend, asset, and infra work unless the user explicitly requests one combined delivery.
8. Record reusable pitfalls in `docs/project/engineering-memory.md`; update the relevant domain skill when the lesson changes default practice.

## Active Sources of Truth

- `docs/project/state.md` and `docs/project/tasks.md` for default recovery
- `docs/project/spec.md` and `docs/project/plan.md` when boundaries or roadmap matter
- `docs/project/engineering-memory.md` for durable pitfalls
- `README.md` for repo orientation
- focused docs under `docs/project/` only when needed

`docs/archive/**` is historical evidence, not an active source of truth. Read it only for an explicitly historical or training-related task.

## Decision Heuristics

- Product scope or roadmap: update active project docs first.
- React/UI: also use `$ruoshui-react-vercel`.
- Viewer, camera, points, minimap, or SOG runtime: also use `$ruoshui-web-3d`.
- Node/shared contracts: also use `$ruoshui-node-mcollina`.
- Workers, D1, R2, migrations, or deployment: also use `$ruoshui-cloudflare-workers`.
- Historical asset/training investigation: only then use `$ruoshui-asset-poc`.

An iteration is done when it has one clear purpose, visible output, relevant validation, cleanup, doc synchronization where needed, and no unrelated changes.
