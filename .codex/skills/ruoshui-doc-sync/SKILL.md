---
name: ruoshui-doc-sync
description: Use when updating project docs, syncing status/tasks/state, preparing handoffs, recording decisions, or deciding which 若水广场 doc should change after implementation. Trigger for `docs/project/**`, `docs/assets/**`, iteration docs, handoff notes, engineering-memory updates, and commit-time doc sync questions.
---

# Ruoshui Doc Sync

## Overview

This skill is the dedicated documentation workflow for 若水广场. Use it when the task is primarily about keeping docs aligned with the real repo state, deciding which doc should absorb a new fact, or preparing a durable handoff.

## When To Use

Use this skill when any of these are true:

- the user asks whether docs need updating
- the task is mainly editing `docs/project/**`, `docs/assets/**`, or `docs/iterations/**`
- a decision, workflow, or experiment result needs a durable written record
- a handoff or progress save is requested
- a commit-sized step changed implementation or workflow and you need to decide which docs should move with it

## Required Workflow

1. Start from the repo state, not thread memory:
   - read the touched code or config first
   - if docs disagree with code, trust verified code and fix the docs
2. Pick the smallest correct destination instead of creating parallel notes:
   - `docs/project/state.md` for current project status or active defaults
   - `docs/project/tasks.md` for next actions, open work, or iteration tracking
   - `docs/project/engineering-memory.md` for durable pitfalls and default workflow changes
   - focused docs in `docs/project/**` for stable architecture, style, platform, or handoff topics
   - `docs/assets/**` for asset policy, inventory, PoC, or validation records
   - `docs/iterations/**` for iteration-specific experiment records
3. Keep docs in sync as a set when needed:
   - if status changed, consider `state.md`
   - if next-step tracking changed, consider `tasks.md`
   - if a reusable pitfall was learned, consider `engineering-memory.md`
4. Prefer updating existing docs over creating new files unless the topic is clearly new and durable.
5. Before finishing, do one pass for stale wording, outdated file paths, and duplicated conclusions.

## Decision Heuristics

- If the fact helps a future thread resume correctly, it probably belongs in docs.
- If the fact only matters for one narrow experiment, put it in the iteration doc, not project-wide docs.
- If the lesson changes the default workflow, add it to `engineering-memory.md`.
- If the change affects a stable domain workflow such as React, Node, Web3D, or Cloudflare, also update the corresponding skill.
- If a doc update would only repeat information already captured in the right canonical file, link or refine instead of duplicating it.

## Good Outcome

- current docs match current code and workflow
- status, task tracking, and durable lessons land in the right files
- no parallel handoff note exists without a clear reason
- future resume work needs less thread archaeology
