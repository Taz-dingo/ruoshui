# Iteration 005 · Progressive Runtime 分支

最后更新：`2026-03-29`

## 当前状态

- 已归档
- 原因：这条分支完成了“单文件 `SOG` 无法提供连续生长式渐进体验”的技术验证，也完成了 `SOG -> PLY -> KSPLAT` 的可行性打样；但当前产品主线已重新收口为 `PlayCanvas/SOG` 正式交付与功能迭代，不再继续把渐进式加载当作近期目标

## 目标

把“丝滑渐进加载”从伪体验优化切回真正的技术路径：改用支持 progressive append / progressively rendered scene 的资产与 loader 链路。

## 本轮结论

- `PlayCanvas/SOG` 当前不适合继续承担这件事：
  - 官方 `GSplatHandler` 会把 `.sog` 交给 `SogBundleParser`
  - `SogBundleParser` 的核心路径是先 `fetch(url.load)`，再 `response.arrayBuffer()`，再解包 `meta.json + textures` 后一次性构建资源
  - 这意味着当前单文件 `.sog` 路线天然更像“整包下载后显示”，不是我们想要的连续生长式 progressive append
- `GaussianSplats3D` 是当前更合适的下一目标：
  - 官方 `README` 明确给出 `addSplatScene(..., { progressiveLoad: true })`
  - 官方描述也明确写到：场景可以在 splats 持续加载的同时被渲染和浏览
  - 这条线本质上就是我们现在真正想要的“边到边显示”

## 现实阻塞

- 当前高质量第三方模型手头只有 `.sog`
- 当前 repo 里并没有与之等质量对应的 `.ply / .splat / .ksplat / .spz`
- 因此若要切到 progressive runtime，下一步必须先解决输入格式问题

## 新增实证

- `assets/hhuc.sog` 已确认不是完全不可读黑盒，而是一个 zip 包
- 当前包内结构为：
  - `meta.json`
  - `means_l.webp`
  - `means_u.webp`
  - `quats.webp`
  - `scales.webp`
  - `sh0.webp`
  - `shN_centroids.webp`
  - `shN_labels.webp`
- `meta.json` 已确认包含 `count=1868855`、`means.mins/maxs`、以及 `scales / sh0 / shN` 的量化信息
- 结合 PlayCanvas 官方 `gsplat-sog-data.js` 的解码逻辑看，位置、旋转、尺度与颜色都不是缺失的；因此“自建 `SOG -> progressive splat format` 转换器”在工程上是可行方向，而不是纯猜想
- `GaussianSplats3D` 官方也已提供 `util/create-ksplat.js`，用于把 `.ply / .splat` 转成 `.ksplat`；这意味着我们若自建转换器，真正需要补的是前半段 `SOG -> PLY`，而不是整条链都从零写

## 当时的推荐顺序

1. 优先向第三方补拿同一模型的非 `SOG` 源资产
   - 首选：`.ksplat` / `.splat`
   - 次选：`.ply`
2. 若上游拿不到，直接进入自建 `SOG -> progressive splat format` 转换器 spike
3. 在 `web/` 内新开一条并行 runtime 分支
   - 保留现有 `React + Zustand + Tailwind` UI
   - 仅替换底层 3D runtime，从 `PlayCanvas` 改为 `GaussianSplats3D`
4. 先做一个单模型最小接入
   - 只接 `original`
   - 不带多版本切换
   - 重点只验证：首屏、加载生长感、切视角时的体感

## 为什么不是继续改现有 `PlayCanvas/SOG`

- 已验证过的 staged preview 方案主观表现为明显闪烁
- 当前官方 `SOG` parser 路线本身不提供我们要的 progressive append 语义
- 继续在这条线上做补丁，投入会越来越像“掩盖不匹配的底层能力”

## 当时的下一步最小实现

- 在 `web/` 里做一个新的 runtime spike：
  - 新增 `GaussianSplats3D` 依赖
  - 抽一层 runtime adapter，允许 `PlayCanvas` 与 `GaussianSplats3D` 并存
  - 用单独入口加载一个 progressive 资产做 A/B 对比

## 当前产出

- 已新增 converter 脚本：
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/web/scripts/sog-to-ply.mjs`
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/web/scripts/ply-to-ksplat.mjs`
- 已新增 progressive runtime 页面：
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/web/progressive.html`
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/web/src/progressive/ProgressiveApp.tsx`
- 已新增脚本入口：
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/web/package.json`
  - `pnpm --dir web run convert:sog:ply -- --input ../assets/hhuc.sog --output ../outputs/iteration-005-progressive-runtime/hhuc-from-sog.ply --degree 2`
- 已完成两次验证：
  - 小样本 `128` splats smoke test
  - 完整 `1868855` splats 全量转换
- 已完成 `GaussianSplats3D progressiveLoad` 页面接入，并确认 `vite build` 已产出 `dist/progressive.html`
- 当前全量产物：
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/outputs/iteration-005-progressive-runtime/hhuc-from-sog.ply`
  - `/Users/tazdingo/Dingo Projetcts/ruoshui/outputs/iteration-005-progressive-runtime/hhuc-from-sog.ksplat`

## 当前体积对比

- `hhuc-from-sog.ply`：约 `292 MiB`
- `hhuc-from-sog.ksplat`：约 `120 MiB`
- 这一轮 `PLY -> KSPLAT` 约再下降 `59%`

## 当前页面用法

- 默认打开：
  - `/progressive.html`
- 强制看 `PLY progressive`：
  - `/progressive.html?source=ply`
- 强制看 `KSPLAT progressive`：
  - `/progressive.html?source=ksplat`

## 当前限制

- 当前 converter 默认把高阶 `SH` 截到 `degree 2`
- 这么做是有意为之：当前目标是尽快进入 `GaussianSplats3D` 的 progressive runtime 验证，而它的 `PLY` parser 实际使用范围也收口在这一级

## 归档结论

- 这轮实验已经回答了核心问题：单文件 `SOG` 不能直接做出目标中的“丝滑渐进生长”
- 若未来再次把“渐进式加载体感”提到高优先级，可从本文件记录的转换链和 `progressive.html` 重新接续
- 在那之前，这些脚本与页面仅保留为研究资产，不视作当前 `Web MVP` 的默认实现方向

## 参考

- PlayCanvas engine `GSplatHandler`：
  - [gsplat.js](https://github.com/playcanvas/engine/blob/main/src/framework/handlers/gsplat.js)
- PlayCanvas engine `SogBundleParser`：
  - [sog-bundle.js](https://github.com/playcanvas/engine/blob/main/src/framework/parsers/sog-bundle.js)
- PlayCanvas engine `GSplatOctreeParser`：
  - [gsplat-octree.js](https://github.com/playcanvas/engine/blob/main/src/framework/parsers/gsplat-octree.js)
- GaussianSplats3D 官方 `README`：
  - [GaussianSplats3D README](https://github.com/mkkellogg/GaussianSplats3D/blob/main/README.md)
