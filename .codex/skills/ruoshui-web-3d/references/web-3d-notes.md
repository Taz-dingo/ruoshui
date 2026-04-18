# Ruoshui Web 3D Notes

Source focus:

- built-in skills:
  - `3d-graphics`
  - `3d-web-experience`
- project context:
  - `docs/project/spec.md`
  - `docs/project/state.md`
  - `docs/project/web-style-system.md`

Use these heuristics in 若水广场 Web3D work:

1. The current product is a memorial Web3D viewer, not a generic sandbox.
2. `PlayCanvas + SOG` is the primary runtime path; optimization should start inside that path first.
3. Separate concerns clearly:
   - viewer runtime/session/orbit/render code
   - projection/alignment helpers
   - React-side panels and controls
4. A “good” 3D change is not only technically correct; it must improve orientation, atmosphere, or readability.
5. For scene-performance work, prefer targeted fixes over renderer churn:
   - render scale correctness
   - fewer avoidable projections/recomputations
   - tighter runtime/UI synchronization
   - better loading and parsing pacing
6. For authored pins and minimap logic, protect coordinate consistency first; pretty UI comes second.
