---
name: ruoshui-project
description: Use when planning, scoping, documenting, saving current progress, preparing a handoff, or implementing the 若水广场 repo. Trigger this skill for project-definition work, roadmap changes, iteration planning, status sync, progress-save requests, commit-sized delivery, or when a new thread needs the current product boundaries and priorities.
---

# Ruoshui Project

## Overview

This skill keeps work aligned with the current definition of 若水广场: a memorial, web-first, desktop-first, aerial `3DGS` experience for revisiting the old campus. Use it to recover project context quickly and keep iterations small, testable, and commit-sized.

## Current Product Boundaries

Treat these as the active defaults unless the user changes them:

- Project name is `若水广场`
- First version is `Web` only
- First version optimizes for desktop, not mobile
- Core goal is high-quality memorial display, not community posting
- Primary scene format is aerial `3DGS`, not `mesh` as the main plan
- First phase avoids login, database, CMS, and open UGC

## Working Rules

When this skill is active:

1. Start from existing project docs before inventing new scope
2. Keep each iteration focused on one small, verifiable step
3. Update the relevant doc when a decision changes
4. Before each commit-sized delivery, also use `$ruoshui-cleanup`
5. Commit after each meaningful step when the result is coherent
6. Prefer clarifying risk early over building speculative features
7. If the user asks to save progress, record current status, or prepare a handoff, sync `docs/project/state.md`, `docs/project/tasks.md`, and the iteration doc before stopping
8. Prefer small, frequent, coherent commits over large mixed changes
9. Avoid bundling unrelated frontend, backend, asset, and infra edits into one oversized iteration unless the user explicitly asks for a combined step
10. Start new feature work on a dedicated branch instead of stacking it directly on shared branches
11. After a coherent step is complete, prefer opening a PR to update others rather than letting the branch drift silently
12. Before opening a PR, do one overall review and validation pass for the full branch to catch cross-file risk, regressions, and missing verification
13. When a nontrivial pitfall changes the team’s default workflow, append it to `docs/project/engineering-memory.md` in the same iteration
14. If that lesson belongs to a stable domain such as React, Node, Web3D, or Cloudflare, also update the corresponding repo skill instead of only updating the memory doc

## Source of Truth

Read these files first when they are relevant:

- `README.md`
- `docs/project/spec.md`
- `docs/project/plan.md`
- `docs/project/tasks.md`
- `docs/project/engineering-memory.md`

Use these files to keep status grounded:

- `docs/assets/asset-inventory.md`
- `docs/assets/poc-001.md`
- `docs/assets/3dgs-experiment-path.md`
- `docs/assets/asset-validation-template.md`

## Decision Heuristics

- If a task concerns product direction, scope, naming, milestones, or iteration rhythm, stay in docs first
- If a task concerns raw images, subset selection, or first-pass `3DGS` validation, also use `$ruoshui-asset-poc`
- If a change increases complexity without reducing current risk, defer it
- If a proposed step is large, split it into a smaller doc, script, or prototype iteration

## Done Criteria for an Iteration

A step is in good shape when it has all of the following:

- one clear purpose
- one visible output
- one minimal validation result
- one cleanup pass
- one small commit
- no unnecessary unrelated changes mixed into the same delivery

## Trigger Hints

This skill should also be used aggressively for prompts like:

- “保存当前进度”
- “记录当前状态”
- “做个交接”
- “把重要信息写进文档”
