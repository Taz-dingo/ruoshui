# Archive Training Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make business development the default project context while preserving old model-training knowledge in an explicit archive and deleting retired experiment entrypoints.

**Architecture:** Keep current product, Web, Cloudflare, style, and operational documents in active paths. Move completed training and delivery experiments into `docs/archive/model-training/`, replace historical status streams with compact current-state documents, and update skills so resume flows no longer load archived training context.

**Tech Stack:** Markdown, Git moves, repository-local Codex skills, pnpm/Vite validation.

---

### Task 1: Create the archive structure and move completed experiment records

**Files:**
- Create: `docs/archive/README.md`
- Create: `docs/archive/model-training/README.md`
- Move: `docs/assets/asset-inventory.md`
- Move: `docs/assets/asset-validation-template.md`
- Move: `docs/assets/poc-001.md`
- Move: `docs/assets/3dgs-experiment-path.md`
- Move: all Iteration 001, 002, and 003 Markdown files
- Move: `docs/iterations/iteration-005-progressive-runtime.md`
- Keep: `docs/assets/raw-asset-policy.md`
- Keep: `docs/iterations/iteration-004-web-mvp.md`

- [ ] **Step 1: Create archive destination directories**

Run:

```bash
mkdir -p docs/archive/model-training/assets docs/archive/model-training/iterations
```

- [ ] **Step 2: Move historical files with Git history**

Use `git mv` for the four retired asset documents, all Iteration 001–003 files, and Iteration 005. Expected: active `docs/assets/` contains only `raw-asset-policy.md`; active `docs/iterations/` contains its README and Iteration 004.

- [ ] **Step 3: Write archive indexes**

`docs/archive/README.md` must explain that archive content is excluded from default resume context. `docs/archive/model-training/README.md` must group asset validation, training iterations, delivery experiments, and the deleted executable entrypoints.

- [ ] **Step 4: Repair links inside the moved archive**

Replace old `docs/assets/...` and `docs/iterations/...` links with their archive paths where they are intended as clickable links. Preserve historical command text that intentionally records the old repository layout.

### Task 2: Replace active project entrypoints with business-phase context

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/iterations/README.md`
- Modify: `docs/project/spec.md`
- Modify: `docs/project/plan.md`
- Modify: `docs/project/state.md`
- Modify: `docs/project/tasks.md`

- [ ] **Step 1: Rewrite the repository and docs indexes**

Describe the current phase as Web viewer, scene content, community notes, and Cloudflare service development. Link active documents first and the archive once; remove the old default reading list for training experiments.

- [ ] **Step 2: Compress the plan to current phases**

Keep a short “completed foundation” section for the accepted SOG asset and Web viewer. Make the active sequence: viewer launch closure, point/content production, community flow, Cloudflare data/media hardening, then deferred account/UGC work.

- [ ] **Step 3: Compress state and tasks**

`state.md` must contain current architecture, shipped capabilities, current local/remote delivery state, known risks, and the single top task. `tasks.md` must contain only active P0/P1/P2 work and a short link to archived training history.

- [ ] **Step 4: Remove stale feasibility wording from spec**

Keep product boundaries and SOG strategy, but replace wording that says asset feasibility or first training remains unresolved.

### Task 3: Delete retired experiment entrypoints

**Files:**
- Delete: root `scripts/`
- Delete: root `configs/`
- Delete: root `experiments/`
- Keep: `web/scripts/`
- Keep: `assets/`, `data/`, `outputs/`, `services/`, `packages/`, `web/`

- [ ] **Step 1: Remove only the approved tracked directories**

Run:

```bash
git rm -r scripts configs experiments
```

Expected: 18 tracked training/asset-analysis files are deleted; no `web/scripts` file is removed.

- [ ] **Step 2: Verify retained paths**

Run:

```bash
test -d web/scripts
test -d web
test -d services
test -d packages
git status --short
```

Expected: all retained application paths exist and only approved deletions/moves/document edits are listed.

### Task 4: Update skills and documentation policy

**Files:**
- Modify: `.codex/skills/ruoshui-resume/SKILL.md`
- Modify: `.codex/skills/ruoshui-project/SKILL.md`
- Modify: `.codex/skills/ruoshui-asset-poc/SKILL.md`
- Modify: `.codex/skills/ruoshui-doc-sync/SKILL.md`
- Modify: `docs/project/development-skills.md`

- [ ] **Step 1: Make resume business-first**

Remove archived asset docs from the default resume workflow. The default read set remains `README`, `spec`, `plan`, `state`, `tasks`, and `engineering-memory`.

- [ ] **Step 2: Mark asset PoC as historical and opt-in**

Point its references to `docs/archive/model-training/assets/`, state that generator scripts were deliberately removed, and require explicit user intent before recreating the pipeline.

- [ ] **Step 3: Add archive routing rules**

Define that current decisions live in active documents, completed experiments move under `docs/archive/`, and archived files are not loaded during normal resume unless the task explicitly concerns them.

### Task 5: Validate references, application build, and commit

**Files:**
- Review: all changed and moved files

- [ ] **Step 1: Scan active documentation for stale paths**

Run:

```bash
rg -n 'docs/(assets/(asset-inventory|asset-validation-template|poc-001|3dgs-experiment-path)|iterations/iteration-00[1235])|scripts/(analyze_assets|colmap_compat|gaussian_ply_tools|materialize_poc_subset|prepare_.*gs|run_.*gs|select_poc_subset)|configs/citygaussian|experiments/iteration-002' README.md docs/project docs/README.md docs/iterations/README.md .codex/skills AGENTS.md
```

Expected: no active instruction points to deleted paths; any remaining match is an explicit archive reference.

- [ ] **Step 2: Run repository validation**

Run:

```bash
git diff --check
npx -y pnpm@10.28.2 --dir web typecheck
npx -y pnpm@10.28.2 --dir web build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Review scope and commit**

Run:

```bash
git status --short
git diff --stat
git add -A
git commit -m "docs: archive retired training context"
```

Expected: the archive branch contains the existing design commit plus one implementation commit, with a clean working tree.
