---
name: ruoshui-resume
description: Use when the user says “继续”, “接着做”, “resume”, or asks to continue the 若水广场 project in a new thread. Recover current business-development context, repo state, open tasks, and the smallest next step.
---

# Ruoshui Resume

## Purpose

Recover the active Web, community, and Cloudflare development context quickly. Model training is archived and must not be loaded during a normal resume.

## Required Workflow

Before substantial implementation:

1. Read `AGENTS.md`.
2. Read `docs/project/state.md`.
3. Read `README.md`, `docs/project/spec.md`, `docs/project/plan.md`, and `docs/project/tasks.md`.
4. Read `docs/project/engineering-memory.md`, especially before deploy or debugging work.
5. Check `git status --short` and `git log --oneline --decorate -5`.
6. Summarize:
   - product goal;
   - current implementation and delivery state;
   - current top task;
   - smallest executable next step.
7. Create or update a short plan before continuing.

## Archive Boundary

- Do not read `docs/archive/**` during normal recovery.
- Read archived training material only when the user explicitly asks about old assets, training, algorithms, or experiment history.
- If that happens, also use `$ruoshui-asset-poc` and open only the relevant files under `docs/archive/model-training/`.
- Never treat archived commands as a currently supported toolchain.

## Execution Rules

- Trust verified repo state over stale prose, then fix the docs.
- Default to the smallest meaningful business step.
- Keep `state.md`, `tasks.md`, focused docs, and engineering memory synchronized when their facts change.
- Use `$ruoshui-cleanup` before each commit-sized delivery.
- Commit coherent iterations and prefer PRs over long-lived local drift.
