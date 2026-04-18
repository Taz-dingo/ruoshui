# Vercel React Notes

Source focus:

- Vercel Engineering React best-practice agent guide:
  [vercel-labs/agent-skills `react-best-practices`](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/AGENTS.md)
- React docs:
  [react.dev](https://react.dev)

Use these heuristics in 若水广场 `web/`:

1. Eliminate waterfalls first. If two async operations are independent, start them together.
2. Check cheap synchronous conditions before awaiting remote or async flags.
3. Put interaction logic in event handlers, not in effects that re-run after render.
4. Prefer `Suspense`, `startTransition`, and `useDeferredValue` when they reduce blocking or expensive derived re-renders.
5. Avoid barrel imports or unnecessarily broad imports in hot frontend paths.
6. Avoid defining components inside components unless there is a strong reason.
7. Do not add `useMemo` for simple primitive calculations; optimize measured pain, not imagined pain.
8. For this repo, performance changes must also preserve the current PlayCanvas runtime and memorial-oriented UI pacing.
