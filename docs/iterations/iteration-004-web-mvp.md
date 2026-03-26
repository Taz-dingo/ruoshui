# Iteration 004 · `SOG` 直加载 Web MVP

## 目标

基于 `assets/hhuc.sog` 直接启动若水广场首个正式 `Web MVP`，优先回答“现成高质量压缩模型能否直接支撑桌面端纪念展示”。

## 输入

- `assets/hhuc.sog`
- `docs/project/spec.md`
- `docs/project/plan.md`
- `docs/project/tasks.md`
- `docs/project/state.md`

## 设计前提

### Visual Thesis

夜色、玻璃与纪念感组成一块全屏展陈幕布，场景本身就是首页。

### Content Plan

- Hero：项目名、项目一句话定位、进入场景
- Support：模型体积、格式、当前加载状态
- Detail：导览镜头与记忆锚点
- Final CTA：继续进入全览或切换策展镜头

### Interaction Thesis

- 加载前先给出纪念语境，而不是技术噪音
- 镜头预设像策展导览一样切换
- 内容层保持轻量，只做提示，不压过场景本身

## 输出

- `web/`：`pnpm + Vite` 前端项目
- `web/public/content/mvp.json`：首版文案、镜头、记忆锚点与多版本 `SOG` 元数据
- `web/vite.config.mjs`：将原始版与派生版 `SOG` 统一映射为 `/models/*`
- `outputs/iteration-004-sog-opt/`：首轮交付侧派生 `SOG` 候选

## 验证方式

- 在 `web/` 目录运行 `pnpm install`
- 运行 `pnpm dev`
- 确认同页版本切换可在原始版、`h0`、`opacity01`、`dec75`、`dec50` 之间完成重载
- 运行 `pnpm build`
- 确认所有 `SOG` 版本都能作为构建产物发出，且页面脚本通过构建

## 当前结果

- 已将正式 viewer 路线切到 `PlayCanvas Engine API + gsplat + SOG`
- 已提供全屏场景背景、加载状态、镜头预设和记忆锚点面板
- 已避免复制模型文件：开发与构建均直接复用仓库根目录资产与 `outputs/iteration-004-sog-opt/` 派生资产
- 已新增同页多版本 compare 交互：版本按钮、版本元数据面板、切换时重挂载运行时
- 当前默认载入版本已切到 `hhuc-h0-dec75.sog`
- 已新增前端可调的界面毛玻璃强度，支持关闭 / 轻 / 中 / 强四档，并通过本地存储记住用户选择

## 补充实验：`SOG` 派生轻量版本

在不能重训第三方模型的前提下，已用 `@playcanvas/splat-transform` 对 `assets/hhuc.sog` 做首轮交付侧派生实验，输出位于 `outputs/iteration-004-sog-opt/`。

- 原始 `hhuc.sog`：约 `27.13 MiB`，`1,868,855` splats
- `hhuc-h0.sog`：约 `21.62 MiB`，保留 `100%` splats，仅去掉高阶 SH
- `hhuc-h0-opacity01.sog`：约 `18.58 MiB`，保留约 `84.8%` splats
- `hhuc-h0-dec75.sog`：约 `16.70 MiB`，保留 `75%` splats
- `hhuc-h0-dec50.sog`：约 `11.45 MiB`，保留 `50%` splats

当前最值得优先主观对比的两版是：

- `hhuc-h0.sog`：低风险、轻度减重
- `hhuc-h0-dec75.sog`：更可能带来明显性能改善

其中 compare 页当前默认先落在 `hhuc-h0-dec75.sog`，理由是它更接近“可正式上 Web”的平衡点，而 `hhuc-h0.sog` 更适合作为保真回退版本。

## 风险与问题

- 当前仍未做真实线上部署，首轮只保证本地开发与构建链路
- 镜头预设是基于现有包围盒做的首轮人工设置，后续仍应根据真实观感微调
- 记忆锚点目前是面板级内容，还未做 3D 场景内热点锚定
- 界面玻璃感当前仍是前端固定预设档位，后续若需要更细控制，可再改为连续滑杆

## 下一步

- 基于 compare 页的主观体验，先从 `dec75` 与 `h0` 中选出正式默认版本
- 若 `dec75` 质量可接受，继续围绕它做首屏加载与交互细化
- 若切换体验稳定，再决定是否追加 `SOG` 侧进一步裁切、分层或发布优化
