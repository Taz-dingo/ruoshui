---
name: ruoshui-project
description: Use when planning, scoping, documenting, saving progress, preparing a handoff, or implementing the 若水广场 repo. Keeps business development aligned with current product boundaries and delivery rules.
---

# Ruoshui Project

## Current Product Boundaries

- `若水广场` is a Web-first digital memorial for the old Changzhou campus.
- The accepted `SOG` scene is the product foundation; model training is complete and archived.
- Current work centers on viewer quality, real story points, community notes, and Cloudflare delivery.
- Desktop remains primary, with practical mobile compatibility.
- Login, moderation, open UGC, CMS, and new renderer research are deferred.

## Working Rules

1. Start from active project docs and verified repo state.
2. Keep each iteration focused, testable, and commit-sized.
3. Use `$ruoshui-doc-sync` for document destinations, handoffs, and state/task/memory synchronization.
4. Use `$ruoshui-cleanup` before every commit-sized delivery.
5. Use dedicated branches for features and prefer a reviewed PR after a coherent step.
6. Do one overall review and validation pass before opening or merging a PR.
7. Do not mix unrelated frontend, backend, asset, and infra work unless the user explicitly requests one combined delivery.
8. Record reusable pitfalls in `docs/project/engineering-memory.md`; update the relevant domain skill when the lesson changes default practice.
9. Keep completed experiments out of active context by moving them under `docs/archive/`.

## Active Sources of Truth

- `README.md`
- `docs/project/spec.md`
- `docs/project/plan.md`
- `docs/project/state.md`
- `docs/project/tasks.md`
- `docs/project/engineering-memory.md`
- focused active docs under `docs/project/`

`docs/archive/**` is historical evidence, not an active source of truth. Read it only for an explicitly historical or training-related task.

## Decision Heuristics

- Product scope or roadmap: update active project docs first.
- React/UI: also use `$ruoshui-react-vercel`.
- Viewer, camera, points, minimap, or SOG runtime: also use `$ruoshui-web-3d`.
- Node/shared contracts: also use `$ruoshui-node-mcollina`.
- Workers, D1, R2, migrations, or deployment: also use `$ruoshui-cloudflare-workers`.
- Historical asset/training investigation: only then use `$ruoshui-asset-poc`.

An iteration is done when it has one clear purpose, visible output, relevant validation, cleanup, doc synchronization where needed, and no unrelated changes.
