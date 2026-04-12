---
name: ruoshui-cleanup
description: Use before every commit-sized delivery in 若水广场. Trigger this skill to sync docs, remove stale or dirty info, clean obvious dead code, check for outdated references, and run the smallest relevant validation before committing.
---

# Ruoshui Cleanup

## Overview

This skill is the pre-commit cleanup pass for 若水广场. Use it before every commit-sized delivery, even for doc-only or “small” changes. Its job is to keep the repo clean, keep docs aligned with the real code, and stop stale debug residue from slipping into commits.

## Required Cleanup Workflow

When this skill is active, do these steps in order before committing:

1. Check current scope with `git status --short`
2. Review the touched files and remove obvious dirty residue inside scope:
   - stale file paths or renamed entrypoints
   - outdated status text or copied old conclusions
   - temporary debug text, placeholder wording, or abandoned notes
   - obvious unused helpers, imports, and dead branches introduced by the current work
3. Sync docs if the implementation or workflow changed:
   - update `docs/project/state.md` when project status or rules changed
   - update focused docs when file names, architecture boundaries, or workflows changed
4. Keep cleanup bounded:
   - fix concrete inconsistencies you can see now
   - do not start a speculative large refactor just because cleanup found a rough edge
5. Run the smallest relevant validation for the touched area:
   - `web/` UI or runtime changes: `pnpm typecheck`
   - production-affecting `web/` changes: `pnpm build`
   - doc-only changes: no build unless the docs describe code paths you also changed
6. If local validation required `vite dev` or `vite preview`, stop those processes before finishing
7. Only then prepare or create the commit

## Cleanup Heuristics

- Prefer removing stale information over adding more explanation around it
- If docs and code disagree, trust the code after verifying it, then fix the docs
- If a helper is no longer referenced, remove it in the same cleanup pass
- If a rename happened, search for old references before committing
- If a dirty note is historically valuable, move it to the right handoff doc instead of leaving it in the wrong file

## Good Outcome

A cleanup pass is good when all of these are true:

- touched files no longer contain obvious stale or dirty information
- current docs match the current code and workflow
- relevant validation has been run or explicitly judged unnecessary
- no temporary dev server is left running from the validation step

## Trigger Hints

Use this skill aggressively for prompts like:

- “commit 前清一下”
- “先打扫一下再提交”
- “检查下 doc 和死代码”
- “提交前做一轮 cleanup”
