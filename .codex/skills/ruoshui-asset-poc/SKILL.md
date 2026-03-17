---
name: ruoshui-asset-poc
description: Use when analyzing `assets/raw`, regenerating the asset inventory, selecting or revising PoC subsets, or updating 3DGS feasibility docs for 若水广场. Trigger this skill for image statistics, duplicate-name handling, PoC sampling strategy, and experiment-record preparation.
---

# Ruoshui Asset PoC

## Overview

This skill handles the asset-analysis workflow for 若水广场. Use it when the task touches source images, PoC subset selection, feasibility validation, or the first-pass `3DGS` experiment path.

## Current Facts

Assume these are the current known facts unless the data is regenerated:

- raw assets live in `assets/raw`
- file names are not unique across directories
- relative path is the only reliable asset identifier
- current inventory output lives in `data/asset_inventory.json`
- current report lives in `docs/asset-inventory.md`
- `PoC 001` currently uses a proportional uniform sample written to `data/poc-001-files.txt`

## Required Workflow

### 1. Rebuild inventory before making claims

When source images change, rerun:

- `python3 scripts/analyze_assets.py`

This regenerates:

- `data/asset_inventory.json`
- `docs/asset-inventory.md`

### 2. Treat file identity correctly

Always use relative paths such as `assets/raw/101MEDIA/DJI_0039.JPG` as the asset key.

Never rely on bare filenames like `DJI_0039.JPG`, because cross-directory duplicates exist and may have different content.

### 3. Choose PoC subsets by coverage goal

Use different sampling logic depending on the question:

- For coverage across mixed directions, prefer uniform sampling from the full corpus
- For continuity along a single flight segment, use a contiguous range only if that is the explicit goal
- If the user says the data is five-directional and continuous ranges are biased, revise the subset strategy

To regenerate the current sample style, run:

- `python3 scripts/select_poc_subset.py --sample-size 180`

### 4. Keep experiment records reusable

When defining or updating a validation run, keep these docs in sync:

- `docs/poc-001.md`
- `docs/3dgs-experiment-path.md`
- `docs/asset-validation-template.md`
- `docs/tasks.md`

## Default First-Pass Heuristics

- Validate feasibility before optimizing for viewer polish
- Prefer smaller subsets that expose pose-recovery risk quickly
- If pose recovery is poor, question coverage and grouping before blaming the front end
- If a subset choice is challenged by better domain knowledge, revise the sample and document why

## Escalation Rules

Move from the current sample strategy to a more structured one when any of these are true:

- the user can identify actual five-direction groupings
- a directory mixes multiple capture modes unevenly
- uniform sampling hides important directional structure
- the first `3DGS` result is too poor to judge
