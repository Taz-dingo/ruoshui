# Community Point Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the existing scene-highlight-to-community flow, reconcile it with the latest `main`, verify the real local flow, and deliver it as one focused frontend iteration.

**Architecture:** Preserve the existing `React + Vite + PlayCanvas/SOG` shell. Scene highlights identify community pins by stable id or title, load a small read-only post preview inside the highlight card, and open the full community sheet for browsing, detail, and composing. Normal page startup must not create forum data; data creation remains an explicit forum or authoring action.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, PlayCanvas, Hono/Cloudflare Worker API, D1 local development.

---

### Task 1: Preserve the dirty work and reconcile with merged main

**Files:**
- Preserve: the nine currently modified `web/` and `docs/project/web-style-system.md` files
- Create: `docs/superpowers/plans/2026-07-04-community-point-notes.md`

- [ ] **Step 1: Create the feature branch without changing file contents**

Run:

```bash
git switch -c codex/community-point-notes
```

Expected: the branch changes from `main` to `codex/community-point-notes`; all dirty files remain present.

- [ ] **Step 2: Stash the complete working tree before integration**

Run:

```bash
git stash push --include-untracked -m "community point notes before main sync"
```

Expected: `git status --short` is empty and the stash contains the nine local files plus this plan.

- [ ] **Step 3: Fast-forward the feature branch to current remote main**

Run:

```bash
git fetch origin main
git merge --ff-only origin/main
```

Expected: branch HEAD contains merge commit `c18b533` or a newer descendant.

- [ ] **Step 4: Restore the local feature changes**

Run:

```bash
git stash pop
git status --short
git diff --check
```

Expected: the feature files are restored without conflict and whitespace validation passes.

### Task 2: Remove unfinished scaffolding behavior and dead variants

**Files:**
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/community/api.ts`
- Modify: `web/src/components/community/CommunitySheet.tsx`
- Modify: `web/src/components/viewer/HighlightLayer.tsx`

- [ ] **Step 1: Remove automatic pin creation from normal page startup**

Delete the `syncCommunityScaffold` effect and the `createScenePin` client helper. Keep `communityPinId` / `communityPinTitle` resolution in `HighlightLayer`; a missing database pin must render the existing empty state instead of mutating D1.

- [ ] **Step 2: Remove the unused contextual `CommunitySheet` variant**

Remove `entryMode`, `initialPinId`, `initialPinTitle`, and `onRequestFullOpen` props and their unreachable branches. Keep the full community sheet as the only sheet mode because point-local previews already live in `HighlightLayer`.

- [ ] **Step 3: Guard async highlight results against stale selection**

Use an effect-scoped request token or `AbortController` equivalent so switching or closing highlights cannot write posts from an older request into the newly active card.

- [ ] **Step 4: Run static validation**

Run:

```bash
npx -y pnpm@10.28.2 --dir web typecheck
npx -y pnpm@10.28.2 --dir web build
git diff --check
```

Expected: all commands exit `0`.

### Task 3: Verify the local forum and browser flow

**Files:**
- Create locally if absent and keep ignored: `services/forum-api/.dev.vars`
- Inspect: `services/forum-api/.dev.vars.example`

- [ ] **Step 1: Prepare and migrate local D1**

Run:

```bash
test -f services/forum-api/.dev.vars || cp services/forum-api/.dev.vars.example services/forum-api/.dev.vars
npx -y pnpm@10.28.2 --filter @ruoshui/forum-api db:migrate:local
```

Expected: migration exits `0` and `.dev.vars` remains untracked/ignored.

- [ ] **Step 2: Start the forum API and web development servers**

Run the repository's `dev:forum-api` and `dev:web` scripts in separate managed sessions. Confirm `GET http://127.0.0.1:8787/api/forum/bootstrap` returns JSON before opening the browser.

- [ ] **Step 3: Exercise the visible user flow**

Verify in the browser:

1. Viewer loads without console errors.
2. Clicking a scene highlight opens its card.
3. “看点位图文” produces loading, empty, or post-preview state without creating duplicate pins.
4. “完整社区” opens the full sheet.
5. Feed, detail, point filter, and return-to-scene interactions remain usable on desktop and a mobile viewport.

- [ ] **Step 4: Stop all temporary servers**

Terminate both managed sessions and confirm no `vite` or `wrangler dev` process remains.

### Task 4: Cleanup, document, and commit the community iteration

**Files:**
- Modify: `docs/project/state.md`
- Modify: `docs/project/tasks.md`
- Keep/update: `docs/project/web-style-system.md`

- [ ] **Step 1: Record the real status**

State that point cards can preview community posts and open the full community sheet; record that normal viewer startup is read-only and real seed content remains a separate content task.

- [ ] **Step 2: Run final verification**

Run:

```bash
npx -y pnpm@10.28.2 --dir web typecheck
npx -y pnpm@10.28.2 --dir web build
git diff --check
git status --short
```

Expected: typecheck/build pass, no whitespace errors, and only the intended community iteration files are modified.

- [ ] **Step 3: Commit the coherent change**

Run:

```bash
git add docs/project/state.md docs/project/tasks.md docs/project/web-style-system.md docs/superpowers/plans/2026-07-04-community-point-notes.md web/public/content/mvp.json web/src/app/App.tsx web/src/community/api.ts web/src/components/community/CommunitySheet.tsx web/src/components/ui/sheet.tsx web/src/components/viewer/HighlightLayer.tsx web/src/content/types.ts web/src/globals.css
git commit -m "feat(web): connect scene points to community notes"
```

Expected: one focused commit and a clean working tree.
