---
name: ruoshui-asset-poc
description: Use only when the user explicitly asks to inspect historical raw-asset inventory, PoC sampling, duplicate-name rules, or 3DGS feasibility for 若水广场. Training is archived and this is no longer a default development workflow.
---

# Ruoshui Asset PoC

## Status

The asset-feasibility and model-training phase is complete. Historical documentation lives under `docs/archive/model-training/`; old root `scripts/`, `configs/`, and `experiments/` were deliberately removed.

Do not activate this workflow for normal Web, community, or Cloudflare work. Do not recreate deleted tooling unless the user explicitly reopens asset validation or training.

## Preserved Facts

- Raw inputs remain in `assets/raw/`.
- Bare filenames are not unique; relative path is the only reliable asset identifier.
- Historical inventory data remains in `data/asset_inventory.json`.
- Historical PoC selection remains in `data/poc-001-files.txt`.
- The accepted product scene is `assets/hhuc.sog`.

## Historical References

Open only what the task needs:

- `docs/archive/model-training/assets/asset-inventory.md`
- `docs/archive/model-training/assets/poc-001.md`
- `docs/archive/model-training/assets/3dgs-experiment-path.md`
- `docs/archive/model-training/assets/asset-validation-template.md`
- `docs/archive/model-training/iterations/`

## If Training Is Reopened

1. Confirm the new question and success criteria with the user.
2. Treat archived commands as evidence, not supported automation.
3. Inspect current assets and environment afresh.
4. Create a new focused plan, tool directory, and iteration record; do not silently restore the deleted pipeline.
5. Preserve relative-path asset identity and record why the old accepted SOG is insufficient for the new goal.
