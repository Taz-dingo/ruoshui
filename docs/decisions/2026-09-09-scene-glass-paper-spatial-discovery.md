# Scene / Glass / Paper 与 Spatial Discovery

日期：2026-09-09

## Context

若水在迭代过程中逐渐出现两套都不算差、但彼此冲突的视觉语言：

1. 早期 3D viewer 使用半透明玻璃面板，让场景保持可见；
2. 后续 Story Feed、My Stories、Composer 为了阅读效率转向浅色、接近 Apple 内容页的实体表面。

与此同时，空间入口也存在两套并行模型：旧 `HighlightLayer + ForumPost` 与正式 `Place + Published Story`。旧 Highlight 会在点击后自动飞镜头、再通过“看点位图文”二次展开旧社区，并可能继续叠加完整社区；正式 Place 虽然已经使用新 Story read model，但点击 Place 仍会自动 focus。已发布 custom Anchor Story 则只在全局社区里可见，无法直接从 3D 场景发现。

继续在这些局部现象上补按钮、补弹窗或统一成“全玻璃 / 全白色”都会强化平行路径，而不是形成一个稳定产品系统。

## Decision

### 1. 用注意力层级而不是单一材质统一设计语言

若水的用户可见 UI 采用：

`Scene → Glass Chrome → Paper Content → Focus Sheet`

- Scene：3D 校园，第一视觉主角。
- Glass Chrome：Dock、镜头菜单、Place / Anchor 轻预览等短暂空间控制层。
- Paper Content：Story Feed / Detail / 评论等阅读内容。
- Focus Sheet：Composer / Account 等需要连续注意力的任务。
- Admin Lab：Streamed SOG、Perf HUD、benchmark 等实验能力，独立于普通用户产品界面。

从 Glass Peek 进入阅读时优先让同一内容容器逐渐 solidify 为 Paper，而不是再叠一个新的 modal。

### 2. 不用重度全屏 blur 建立层级

背景强弱优先通过 surface opacity、局部 dim、排版与对比度建立。场景在 Story Feed / Detail 后仍应明显可辨；只有 Composer / Account 等 Focus Sheet 可以进一步压低背景。

### 3. 生产空间入口统一为 Place + Published Story Anchor

普通用户生产空间层只使用：

- Place Pin
- Published Story custom Anchor Pin
- Story Anchor Cluster

旧 Highlight / ForumPost demo 不再进入普通用户界面，只可保留在 Admin Lab / development 作为历史实验工具。

### 4. 点击空间入口只打开内容，不自动飞镜头

点击 Place / Story Anchor 的第一动作是打开轻预览。Camera focus 是显式“飞到这里”操作。

Place Peek 直接展示 intro 和 Story 内容，不再提供“看点位图文”二次按钮；Story Anchor Peek 直接展示 Story 预览。继续阅读在同一内容容器内完成。

### 5. 已发布 custom Anchor 必须可发现，并通过 cluster 控制密度

已发布 custom Anchor 不应只用于 Story Detail 的“回到这里”。它应投影到场景，并在高密度 / 远景时按屏幕空间聚合。Place 的视觉优先级始终高于 Story Anchor，不能被 Story cluster 吞掉。

### 6. 全校园社区成为底部一级入口

普通用户 Dock 提供“校园故事”，作为全局 Published Story Feed / Detail 入口，与空间发现互补，不再依赖旧 Highlight 才能进入完整社区。

## Invariants

- 普通用户不看到旧 Highlight / ForumPost demo、Streamed SOG、Perf HUD 等实验概念。
- 不通过 UI 隐藏替代后端权限；Admin Lab 不是写权限边界。
- Place / Story Anchor 点击不自动 focus。
- Place / Anchor 内容无需“看图文”二次门槛。
- 同一阅读层级不叠多个 modal。
- custom Anchor 只有在 Story Published 后才成为公共空间入口。
- Place 永远不被 Story Anchor cluster 聚合吞掉。

## Alternatives considered

### 全部继续用 Liquid Glass

优点是风格统一且与 3D 场景融合。缺点是长文本、图片 Feed、评论和表单需要不断增加 blur、gradient、shadow 才能获得可读性，最终 chrome 反而更重。

### 全部改成白色 / Paper

阅读效率高，但会让若水退化成“普通图片社区叠在 3D 背景上”，场景与空间关系被切断。

### custom Anchor 只留在全局社区

实现简单，但浪费了作者标注空间的意义，也让用户无法从场景发现这些记忆。

### 所有 Anchor 直接显示独立 Pin

实现简单，但内容一多会迅速淹没场景，因此选择屏幕空间 clustering。

## Consequences

- `design.md` 成为 Material / Attention hierarchy 的唯一设计 contract。
- `spec.md` 将 Spatial Discovery 与 Place / Anchor 点击行为固定为产品 contract。
- `HighlightLayer` 需要退出普通生产 UI。
- Place 点击需要取消隐式 focus，并保留显式“飞到这里”。
- Dock 需要普通用户“校园故事”入口。
- Published Story read 数据需要新增场景投影 / clustering 消费链路。
- Paper / Glass 的具体动画曲线、blur / dim 数值仍需在真实 3D 页面通过视觉验收收敛。

## Deferred work

- Story Anchor clustering 的具体半径、zoom / focus 策略和移动端密度。
- Glass → Paper solidify 的具体动画参数。
- Story Anchor Pin 是否显示缩略图、仅圆点或其他轻量视觉形态。
- 全局社区后续的地点 / 时间筛选与推荐能力。
