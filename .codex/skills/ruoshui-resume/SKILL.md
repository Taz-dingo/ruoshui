---
name: ruoshui-resume
description: Use when the user says “继续”, “接着做”, “resume”, or asks to continue the 若水广场 project in a new thread. Trigger this skill to recover project background, current implementation status, open tasks, recent decisions, and then produce an execution plan before doing new work.
---

# Ruoshui Resume

## Overview

This skill is the recovery entrypoint for 若水广场. Use it at the start of a new thread or whenever continuity is uncertain. Its job is to rebuild working context fast, summarize the current state, and turn “继续” into a concrete next-step plan.

## Required Resume Workflow

When this skill is active, do these steps in order before implementing anything substantial:

1. Read `AGENTS.md`
2. Read `docs/project/state.md` first if it exists
3. Read `README.md`, `docs/project/spec.md`, `docs/project/plan.md`, and `docs/project/tasks.md`
4. If asset work is involved, also use `$ruoshui-asset-poc` and read:
   - `docs/assets/asset-inventory.md`
   - `docs/assets/poc-001.md`
   - `docs/assets/3dgs-experiment-path.md`
   - `docs/assets/asset-validation-template.md`
5. Check repo freshness with:
   - `git status --short`
   - `git log --oneline --decorate -5`
6. Summarize the project in four parts:
   - background and product goal
   - current implementation/doc status
   - current top task
   - next smallest executable step
7. Create or update a short plan before continuing implementation

## What Good Recovery Looks Like

After the resume flow, the agent should be able to state clearly:

- what 若水广场 is
- what the first version includes and excludes
- what has already been implemented or documented
- what the latest decisions changed
- what single step should happen next

## Execution Rules After Resume

- Default to the smallest meaningful next step
- Prefer updating the existing docs and scripts over inventing parallel notes
- If the previous thread ended mid-decision, restate the decision before coding
- If the repo state and docs disagree, trust the repo state and then fix the docs
- Commit after each coherent iteration

## Keep This File Ecosystem Fresh

When a meaningful step lands, keep these files in sync as needed:

- `docs/project/state.md`
- `docs/project/tasks.md`
- any focused decision doc created in that iteration

## Trigger Hints

This skill should be used aggressively for prompts like:

- “继续”
- “接着做”
- “继续这个项目”
- “resume the project”
- “回到若水广场”
