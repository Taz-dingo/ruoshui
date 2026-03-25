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
- `web/public/content/mvp.json`：首版文案、镜头、记忆锚点结构
- `web/vite.config.mjs`：将根目录 `assets/hhuc.sog` 映射为 `/models/hhuc.sog`

## 验证方式

- 在 `web/` 目录运行 `pnpm install`
- 运行 `pnpm build`
- 确认 `hhuc.sog` 能被作为构建产物发出，且页面脚本通过类型检查

## 当前结果

- 已将正式 viewer 路线切到 `PlayCanvas Engine API + gsplat + SOG`
- 已提供全屏场景背景、加载状态、镜头预设和记忆锚点面板
- 已避免复制模型文件：开发与构建均复用仓库根目录 `assets/hhuc.sog`

## 风险与问题

- 当前仍未做真实线上部署，首轮只保证本地开发与构建链路
- 镜头预设是基于现有包围盒做的首轮人工设置，后续仍应根据真实观感微调
- 记忆锚点目前是面板级内容，还未做 3D 场景内热点锚定

## 下一步

- 先验证本地构建与实际加载体验
- 若加载稳定，继续补首页说明区与场景内热点联动
- 再决定是否追加 `SOG` 侧进一步裁切、分层或发布优化
