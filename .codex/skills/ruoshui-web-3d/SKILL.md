---
name: ruoshui-web-3d
description: Use for 3D viewer/runtime, PlayCanvas integration, SOG scene delivery, camera control, minimap projection, point overlays, render performance, and Web3D interaction work in 若水广场. Trigger when touching `web/src/runtime/**`, `web/src/components/viewer/**`, `web/src/app/viewer*`, `web/src/ui/**`, PlayCanvas scene orchestration, 3D interaction, or viewer performance tuning. This skill should usually be paired with `$3d-graphics`, `$3d-web-experience`, and `ruoshui-react-vercel` when UI and runtime cross.
---

# Ruoshui Web 3D

Use this skill for the Web3D side of 若水广场, especially when the task affects scene runtime, camera motion, spatial overlays, or the line between viewer performance and memorial experience.

## Use Together With

- `$3d-graphics`
- `$3d-web-experience`
- `ruoshui-react-vercel` when the change also touches React panels or UI state

## Working Rules

1. Preserve the current viewer strategy:
   - `PlayCanvas + SOG` remains the default delivery path
   - do not casually fork into another renderer unless the task is explicitly a technical spike
2. Keep scene runtime and React presentation separated:
   - engine/session/camera orchestration stays in runtime modules
   - React components consume typed state, events, and commands
3. Favor changes that improve orientation, pacing, and scene readability over flashy but unstable interactions
4. Camera and spatial UI changes must protect these experience goals:
   - stable orientation
   - readable target transitions
   - low surprise during navigation
   - memorial tone over demo feel
5. Performance work should prioritize:
   - visible interaction smoothness
   - loading/parsing feedback
   - predictable render scale behavior
   - avoiding unnecessary CPU work between PlayCanvas and React layers
6. Spatial features such as minimap, point overlays, route previews, and authored pins must stay aligned with real scene coordinates and camera projection assumptions

## What Good Output Looks Like

- viewer runtime remains understandable after the change
- 3D interaction becomes clearer, steadier, or faster
- overlays and camera logic stay spatially consistent
- the experience still feels intentional and commemorative rather than like a raw graphics demo

## References

- Read [references/web-3d-notes.md](references/web-3d-notes.md) when the task touches runtime structure, scene interaction, or Web3D performance tradeoffs
