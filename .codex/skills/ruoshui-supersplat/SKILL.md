---
name: ruoshui-supersplat
description: Use for SuperSplat-based gaussian asset editing, cleanup, selection, crop/delete workflows, project save/load, import/export decisions, and delivery-format checks in 若水广场. Trigger when the task concerns `.ply`, `.splat`, `.sog`, `.ssproj`, SuperSplat editor workflow, splat cleanup, export format choice, or asset preparation before PlayCanvas/Web delivery.
---

# Ruoshui SuperSplat

Use this skill when the task is about editing or preparing gaussian assets in SuperSplat rather than changing the runtime viewer itself.

## Use Together With

- `ruoshui-web-3d` when asset decisions directly affect viewer/runtime behavior
- `ruoshui-asset-poc` when the task is still part of early asset-validation or PoC judgement

## Working Rules

1. Treat SuperSplat as an asset-editing and delivery-prep tool, not as the viewer/runtime source of truth
2. Keep these concerns separate:
   - SuperSplat: cleanup, crop/delete, inspection, import/export, publishing/export format choice
   - Web3D runtime: camera, overlays, interaction, render pacing, viewer integration
3. Before changing export format, state clearly what the output is for:
   - editor/project persistence
   - viewer delivery
   - lightweight sharing
   - downstream conversion
4. Prefer reversible cleanup first:
   - save/load project state where possible
   - document destructive deletion steps
   - keep original assets untouched unless the task explicitly asks otherwise
5. When discussing export choices, call out the tradeoff:
   - fidelity
   - size
   - compatibility
   - whether it fits the current `PlayCanvas + SOG` delivery path
6. If the task mentions `SOG`, `compressed PLY`, `.splat`, `.ply`, or published HTML viewers, use the official SuperSplat docs as the default reference set before inferring behavior

## What Good Output Looks Like

- asset-editing steps are distinct from runtime-engine changes
- export recommendations are tied to the current delivery goal
- cleanup operations are reversible or at least clearly documented
- format decisions line up with the project’s current PlayCanvas/SOG path

## References

- Read [references/supersplat-notes.md](references/supersplat-notes.md) when the task touches import/export, cleanup workflow, publish/share flow, or format compatibility
