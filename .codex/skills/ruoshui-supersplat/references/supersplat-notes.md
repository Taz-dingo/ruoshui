# SuperSplat Notes

Official sources:

- Product page:
  [PlayCanvas SuperSplat](https://playcanvas.com/products/supersplat)
- Open-source repository:
  [playcanvas/supersplat](https://github.com/playcanvas/supersplat)
- User manual entry:
  [SuperSplat user guide](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/)
- Import / export:
  [Import and Export](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/import-export/)
- Publishing:
  [Publishing](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/publishing/)
- Data inspection:
  [Data Panel](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/data-panel/)
- Rendering output:
  [Rendering Media](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/rendering/)
- Camera animation:
  [Timeline](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/timeline/)
- Project persistence:
  [Saving and Loading Projects wiki](https://github.com/playcanvas/supersplat/wiki/Saving-and-Loading-your-Projects)

Use these heuristics in 若水广场 asset work:

1. SuperSplat is the right layer for cleanup, inspection, cropping, selection, and export choice.
2. The runtime viewer is still decided by project delivery needs, not by whichever export option looks convenient in the editor.
3. If a workflow is destructive, preserve the original source asset and record the derived output.
4. For format-choice discussions, explicitly state:
   - what the source format is
   - what the target format is
   - whether the target is for PlayCanvas delivery, sharing, or another tool
5. For this repo, any recommendation should be checked against the current `PlayCanvas + SOG` mainline rather than assuming a generic gaussian pipeline.
