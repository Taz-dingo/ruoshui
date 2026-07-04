---
name: ruoshui-resume
description: Use when the user says “继续”, “接着做”, “resume”, or asks to continue the 若水广场 project in a new thread. Recover current business-development context, repo state, open tasks, and the smallest next step.
---

# Ruoshui Resume

Recover the active Web, community, and Cloudflare development context quickly. Training is archived and must not be loaded during a normal resume.

## Required Workflow

Before substantial implementation:

1. Read `AGENTS.md`.
2. Read `docs/project/state.md`.
3. Check `git status --short` and `git log --oneline --decorate -5`.
4. If the current top task is still unclear, read `docs/project/tasks.md`.
5. If product scope or delivery direction is still unclear, read `README.md`, `docs/project/spec.md`, and `docs/project/plan.md`.
6. Read `docs/project/engineering-memory.md` only before deploy/debug work or when the touched subsystem has known pitfalls.
7. Summarize the product goal, current implementation state, top task, and smallest executable next step.
8. Create or update a short plan before continuing.

## Archive Boundary

- Do not read `docs/archive/**` during normal recovery.
- Read archived training material only for explicit historical/training requests; if needed, also use `$ruoshui-asset-poc` and open only the relevant files.
- Never treat archived commands as a currently supported toolchain.

## Execution Rules

- Trust verified repo state over stale prose, then fix the docs.
- Default to the smallest meaningful business step.
- Prefer a staged read over eager loading; only open more docs when the previous layer does not answer the question.
- Keep `state.md`, `tasks.md`, focused docs, and engineering memory synchronized when their facts change.
- Use `$ruoshui-cleanup` before each commit-sized delivery.
- Commit coherent iterations and prefer PRs over long-lived local drift.
