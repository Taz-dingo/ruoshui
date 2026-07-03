---
name: ruoshui-doc-sync
description: Use when updating project docs, syncing state/tasks/engineering-memory, preparing handoffs, recording decisions, or archiving completed 若水广场 work.
---

# Ruoshui Doc Sync

## Required Workflow

1. Start from verified code, config, git state, and delivery state; fix docs when they disagree.
2. Choose the smallest canonical destination:
   - `docs/project/state.md`: current implementation and active defaults;
   - `docs/project/tasks.md`: open work and priorities;
   - `docs/project/engineering-memory.md`: durable pitfalls and workflow corrections;
   - focused `docs/project/**`: stable architecture, style, platform, or handoff topics;
   - `docs/iterations/**`: current iteration-specific records;
   - `docs/assets/raw-asset-policy.md`: active raw-asset retention policy;
   - `docs/archive/**`: completed experiments and retired context.
3. Update the smallest related set. A status change may require both `state.md` and `tasks.md`; a reusable pitfall may also require a domain skill update.
4. Prefer editing canonical docs over creating parallel handoff notes.
5. Scan for stale wording, paths, duplicated conclusions, and links before finishing.

## Active vs Archive

- Active docs describe current product decisions, implementation, delivery state, and open work.
- Archive docs preserve completed experiments without participating in normal resume.
- When a direction is permanently stopped, move its durable record to `docs/archive/`, add it to the archive index, and remove it from active task/status streams.
- Historical documents should remain faithful to their time; do not rewrite old results into current policy.
- Never move unresolved or currently executable work into archive merely to shorten context.

## Good Outcome

Future resume work can recover the business phase from active docs alone. Historical evidence remains discoverable through one archive index, without stale commands or retired experiments occupying the default context.
