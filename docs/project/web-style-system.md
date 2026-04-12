# Web Style System

最后更新：`2026-04-13`

## 目标

`web/` 的样式系统从这一步开始收口为：

- `Tailwind v4 @theme` 负责主题 token
- `TS + cva` 负责 semantic primitive
- 原始 `CSS` 只保留运行时视口变量、复杂动画、`PlayCanvas` 容器耦合和尚未迁移的 legacy selector

这次重构的重点不是“把所有样式都塞进一个文件”，而是建立之后能持续迁移的边界。

## 分层规则

### 1. Theme Token

位置：

- `web/src/style.css`

职责：

- 定义颜色、阴影、圆角、基础字号、字体族等主题 token
- 通过 `@theme` 暴露给 `Tailwind`

当前已建立的 token 类型：

- `color`: `canvas / ink / ink-muted / brand / outline / surface`
- `shadow`: `panel`
- `radius`: `panel / control`
- `text`: `ui-xs / ui-sm / ui-title`

规则：

- 新增视觉 token 时，优先加到 `@theme`
- 不要继续在组件里散落新的 `rgba(...)` 和硬编码颜色

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

### 3. Legacy CSS Layer

位置：

- `web/src/style.css`

当前保留原因：

- `safe-area` 和 `viewport` 运行时变量依然要靠 CSS 承载
- `scene / hud / highlight / loading` 有较多 `PlayCanvas` 容器耦合
- 现有移动端抽屉、inspector 和动画类还没完全迁出

规则：

- 这里只允许继续承载“结构耦合强、动画复杂、临时未迁移”的样式
- 新增普通 UI 视觉时，不再优先往这里加新类

## 本轮已完成的首批迁移

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

## 后续迁移顺序

建议按下面顺序继续：

1. `inspector-section / slider-field / accordion` 这组结构件
2. `viewer` 侧的 panel 内部 typography 和 spacing
3. 移动端抽屉相关的 legacy class
4. 最后再收 `style.css` 里残余的大块视觉 selector

## 当前边界

这一步没有解决：

- `Mobile Safari` 安全区中场景不完全填满的问题
- 旧的复杂布局类仍然大量存在于 `style.css`

这一步解决的是：

- 后续 UI 改动不必继续依赖原始 CSS 里散落的颜色 / 面板 / 控件定义
- 样式系统有了明确入口，后续可以分批迁移而不是整仓推翻
