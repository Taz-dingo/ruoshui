# Web Style System

最后更新：`2026-04-18`

## 目标

`web/` 的样式系统现在已经收口为：

- `Tailwind v4 @theme` 负责主题 token
- `TS + cva` 负责 semantic primitive
- 全局 `CSS` 只保留运行时视口变量、reset 和 keyframes

这次重构的重点不是“把所有样式都塞进一个文件”，而是建立之后能持续迁移的边界。

## 分层规则

### 1. Theme Token

位置：

- `web/src/globals.css`

职责：

- 定义颜色、阴影、圆角、基础字号、字体族等主题 token
- 通过 `@theme` 暴露给 `Tailwind`

当前已建立的 token 类型：

- `color`: `canvas / ink / ink-muted / brand / outline / surface`
- `color`: `community-*`，用于图文社区这类浅底、暖色、editorial 风格的局部界面
- `shadow`: `panel / community`
- `radius`: `panel / control`
- `text`: `ui-xs / ui-sm / ui-title`

规则：

- 新增视觉 token 时，优先加到 `@theme`
- 不要继续在组件里散落新的 `rgba(...)` 和硬编码颜色
- 如果只是某个子域（例如社区 feed）需要一整组独立视觉语言，优先新增成一组语义化 token，而不是把临时色值直接写进业务组件
- 当 viewer HUD 和社区层需要统一视觉语言时，优先先收敛共享 token（例如 `brand / outline / surface`），再决定哪些区域继续保留 `community-*` 的局部增强
- 如果 HUD 已经有更合适的主色语义，社区不要抢主色；优先保留 HUD 的品牌色，把社区做成“不同材质的表面，同一套交互色”

### 2. Primitive Layer

位置：

- `web/src/styles/system.ts`

职责：

- 定义跨组件共享的样式 primitive
- 定义高频 surface / button / badge / select / switch / app-shell 语义类
- 用 `cva` 承担 variant 组合，而不是把视觉差异直接堆到业务组件里

当前已迁移的入口：

- `appShellClassNames`
- `buttonVariants`
- `badgeVariants`
- `itemCardButtonVariants`
- `surfaceClassNames`
- `selectClassNames`
- `switchClassNames`
- `textClassNames`

规则：

- 基础件优先从这里取语义类
- 业务组件尽量只做组合，不重新发明自己的面板 / 按钮 / 输入样式
- 社区和 HUD 默认走克制策略：没有导航、状态、操作价值的标签、徽章、说明块和辅助文案，不要加
- 如果一个区块去掉后不影响理解、定位或操作，就应该删掉，而不是继续美化

### 3. Global CSS Layer

位置：

- `web/src/globals.css`

当前保留原因：

- `safe-area` 和 `viewport` 运行时变量依然要靠 CSS 承载
- `Tailwind` 入口和全局 reset 仍应集中在一个文件
- 动画 `keyframes` 继续放在 CSS 更清晰

规则：

- 这里只允许继续承载全局变量、reset 和 keyframes
- 不再新增组件级 selector

## 已完成迁移

已从散落硬编码样式改为走 style system 的文件：

- `web/src/app/App.tsx`
- `web/src/main.tsx`
- `web/src/components/ui/button.tsx`
- `web/src/components/ui/badge.tsx`
- `web/src/components/ui/card.tsx`
- `web/src/components/ui/info-field-card.tsx`
- `web/src/components/ui/item-card-button.tsx`
- `web/src/components/ui/select.tsx`
- `web/src/components/ui/sheet.tsx`
- `web/src/components/ui/switch.tsx`
- `web/src/components/ui/inspector-section.tsx`
- `web/src/components/ui/slider-field.tsx`
- `web/src/components/viewer/*`
- `web/src/runtime/canvas-host.ts`

## 当前结构

- `web/src/globals.css`
  现在只保留：
  - `Tailwind @theme` token
  - 运行时 viewport / safe-area 变量
  - reset / base
  - keyframes

- `web/src/styles/system.ts`
  现在承载：
  - `app shell`
  - `surface`
  - `button / badge / select / switch`
  - `inspector / slider / item-card / toggle-card`
  - 共享文字、滚动区域和响应式 primitive

- 组件文件
  现在直接在 `TSX` 内组合 `Tailwind` 类，不再依赖一大批全局 class selector

## 剩余约束

这个重构完成后，仍然保留的全局 CSS 能力只有：

- 浏览器 / 运行时需要的全局 reset
- `Mobile Safari` 相关的 viewport 变量
- 动画 keyframes

不再保留：

- 依赖全局 `.panel / .hero / .route-log / .quality-toggle / .mobile-sheet` 之类 class selector 的样式组织方式
- 把视觉细节继续堆回 `globals.css`

## 已知未解决项

- `Mobile Safari` 安全区里场景本身未完全填满的问题，仍是独立布局 / viewport 问题，不属于本次样式系统重构范围
- commit 前应额外跑一次 repo cleanup，确认文档、旧引用和死代码没有被样式改动带脏
