# 若水广场 Design Contract

本项目以 [Apple reference DESIGN.md](docs/design/apple-reference/DESIGN.md) 为外部参考，执行版针对 3D 校园记忆地图做了裁剪。后续任何用户可见 UI 改动必须先读本文件，再读 reference；不要把 reference 的营销页结构直接复制到 viewer，也不要脱离本 contract 自行发明第二套设计语言。

## Visual thesis

**若水不是“全玻璃 UI”，也不是“白色内容后台”。它是一套按注意力层级变化材质的系统：Scene → Glass Chrome → Paper Content → Focus Sheet。**

3D 场景始终是空间主角；控制层尽量隐形；当用户明确要阅读记忆时，同一个内容容器可以从 translucent glass 逐步 solidify 成浅色 paper，让内容取得主导权，但仍保持与背后校园空间的联系。

Apple reference 的核心不是“把所有组件做成某种外观”，而是低 chrome、低密度、强内容层级、克制颜色与充足留白。若水继承这些原则，再用空间场景与材质递进形成自己的视觉语言。

## Material hierarchy

### 1. Scene

负责：3D 校园本身。

- edge-to-edge；不放固定 hero 卡、常驻标题块或 dashboard。
- 场景原色就是主视觉，不用装饰性渐变额外制造氛围。
- 未主动阅读内容时，尽量不 dim、不 blur。

### 2. Glass Chrome

负责：场景控制与轻量 spatial peek，例如 Dock、镜头菜单、Place / Story Anchor 的轻提示、Admin Lab 即时控制。

- translucent、backdrop blur、中性黑白灰；文本短、控件少。
- 玻璃是功能层，不承载长文、复杂表单、大段社区内容。
- 使用场景透出的颜色提供环境感，不叠多层彩色渐变。
- 小尺寸、漂浮、短暂；用户退出当前操作后应迅速退回场景。

### 3. Paper Content

负责：Story Feed、Story Detail、Place 的完整 Story 阅读层、评论等内容消费。

- 主要使用 `#ffffff` / `#f5f5f7` / `#fafafc` 一类稳定浅色表面和 `#1d1d1f` 一类深色正文。
- 大面积留白、少 border、少 shadow、少嵌套卡片；让照片、标题和正文自己建立层级。
- 不把 Paper 做成 SaaS dashboard；状态统计、管理动作应尽量通过排版和轻分隔表达，不层层套 rounded card。
- 从 Glass Peek 进入阅读时，优先让**同一容器材质逐渐 solidify**，而不是再叠一个新的 modal。

### 4. Focus Sheet

负责：Story Composer、账号设置、需要连续注意力的编辑任务。

- 可以比 Paper Content 更 solid、更聚焦。
- 背景允许更明显 dim / very light blur，但仍不应把 3D 场景抹成完全无意义的色块。
- 进入 Focus Sheet 表示用户暂时从“探索空间”切到“完成任务”。

### 5. Admin Lab

负责：模型 variant、Streamed SOG、Perf HUD、benchmark、viewport debug 等实验 / 诊断能力。

- 仅实验入口暴露；普通用户不看到模型版本、LOD、性能术语。
- Admin Lab 是实验界面，不是数据权限边界；Review / Place / Comment 等写操作仍由后端 `ADMIN_USER_IDS` 强制授权。

## Attention progression

交互层级应形成连续关系，而不是弹窗堆叠：

`Scene → Glass Peek → Paper Feed → Story Detail → Focus Sheet`

- 点击空间点位只进入 Glass Peek / 内容预览，不自动改变镜头。
- 用户主动点击“飞到这里”后才执行 camera focus。
- Place Peek 内直接展示对应 Story 预览；**不存在“看点位图文”这种二次门槛**。
- 从 Peek 进入更多 Story 时，同一个内容容器扩展 / solidify；不要在旧弹窗上再盖第二个弹窗。
- Story Detail 仍保留“回到这里”，把用户带回其 Place / custom Anchor。

## Background separation

层级关系主要通过**surface opacity、局部 dim、排版与对比度**建立，不依赖全屏重 blur。

推荐方向，不作为硬编码数值：

- Scene / Place Peek：不 blur 或极弱 blur，背景几乎完整可读。
- Story Feed：轻 dim，最多轻微 blur；校园仍明显可辨。
- Story Detail：可略高于 Feed，但空间关系仍应存在。
- My Stories：中等 dim / light blur。
- Composer / Account：最强的背景压低，但仍避免重度高斯模糊把场景彻底抹掉。

任何新增全屏 blur 都必须回答：能否用 surface opacity / dim / contrast 更好地解决？

## Spatial hierarchy

生产空间层只有三类公共入口：

1. **Place Pin**：稳定、命名、公共地点；优先级最高，始终不被 Story cluster 吞掉。
2. **Story Anchor Pin**：已发布 Story 的 custom Anchor；比 Place 更轻，不显示长标题，不与 Place 争夺视觉主导。
3. **Story Anchor Cluster**：远景或高密度区域将多个 Anchor 按屏幕距离聚合成计数入口，缩放 / focus 后逐步拆分。

原则：

- 已发布 custom Anchor 不应只藏在“完整社区”里；它在场景中必须有可发现入口。
- 聚合优先按**屏幕空间**处理，避免固定世界距离在不同镜头尺度下失真。
- 点击 cluster 优先 focus / zoom 到该区域让点自然拆开；无法继续拆分时再显示“这里有 N 段记忆”的轻 Glass Peek。
- Story Anchor Pin 点击后直接显示该 Story 的轻预览和“飞到这里 / 阅读全文”；不要再增加“看图文”按钮。
- Place 无 Story 时使用自然 empty state，例如“这里还没有留下故事 / 成为第一个留下记忆的人”，不显示开发占位文案。

## Global navigation

普通用户桌面 Dock 的产品入口应至少包含：

- 导览镜头
- 校园故事（完整 Published Story 社区）
- 我的 Story
- 留下故事

模型版本 / Streamed SOG / Perf HUD 仅进入 Admin Lab / development UI。

“校园故事”是空间之外的全局消费入口，交互心智可参考成熟图片社区的 Feed，但视觉仍遵守若水的低 chrome、Paper Content 与地点语义，不逐像素复刻第三方产品。

## Color roles

- 内容背景：场景原色或 Paper 中性浅色，不用装饰性渐变制造氛围。
- Glass UI 表面：中性黑、白、灰的透明材质；依靠透明度、模糊、亮度和 hairline 建立层级。
- 文本：Glass 上用白色 / 系统灰，Paper 上用深色正文；辅助信息不能靠过低对比度伪装层级。
- 唯一强调色：若水嫩叶绿 `#a8c97d` / `#c7e39e`，只用于主操作、状态、focus 和明确选中态；不为每个控件染色。
- 不使用树皮棕、青蓝、霓虹蓝或多色渐变作为 viewer UI 品牌色。

## Typography

- 字体优先使用 `SF Pro Display, SF Pro Text, system-ui, -apple-system, sans-serif`；非 Apple 平台回退 Inter。
- 标题用 600，不用粗重 700；显示字号使用轻微负字距。
- 正文保持可读，优先 14–17px 和约 1.45–1.8 行高；长文宁愿增加留白，不靠小字号压密度。
- 字体层级少而稳定：标题、正文、caption、micro label。

## Layout and surfaces

- 控件优先 capsule / 44px touch target；面板使用 18–26px 圆角，避免卡片马赛克。
- 以留白、对齐和场景裁切建立层级，不以边框、阴影或渐变堆层级。
- 桌面和移动都只保留必要入口；移动端使用底部抽屉并适配 safe area。
- viewer 桌面端常驻控制收在底部略高于安全区的居中图标 Dock；默认只显示图标，不显示完整面板。

## Viewer-specific rules

- 左上纪念标题区和右上小地图从生产 UI 隐藏；地图计算、热点投影和数据结构可以保留。
- 旧 `HighlightLayer` / ForumPost demo 不再属于普通用户产品层；如需保留，仅在 Admin Lab / development 中作为历史实验工具出现。
- 普通用户生产空间层统一使用 Place + Published Story custom Anchor，不再维护第二套可见点位交互。
- dock 图标 hover 只做嫩叶绿高亮，不做整体上浮；菜单互斥，移动端改为点击展开底部抽屉。
- dock 菜单使用 `@floating-ui/react` 的安全路径方案，并确保触发器到菜单之间没有真实 pointer dead gap；离开安全区域后关闭。
- 玻璃面板出现时直接使用最终透明度、模糊和饱和度，只做短距离位移；不要对 `opacity` 或 `backdrop-filter` 做会造成“先透明、后模糊”的入场动画。
- 动画短、稳、可逆；禁止弹跳和持续装饰动画。

## Agent guardrails

- 修改 UI 前先复用 `web/src/styles/system.ts` 的 token 和 primitive；如果现有 primitive 混合了 Glass / Paper 语义，应先按本 contract 拆清语义，而不是继续在业务组件散落颜色。
- UI 改动必须说明它属于 Scene / Glass Chrome / Paper Content / Focus Sheet / Admin Lab 哪一层。
- 新增颜色前证明嫩叶绿和中性灰不够用；新增渐变前证明场景本身无法提供同样效果。
- 不新增视觉设计依赖；优先 CSS、系统字体和现有 primitives。
- 不把 Apple 的营销页产品 tile、导航栏或蓝色 CTA 直接照搬进 3D viewer。
- 不通过增加一个按钮、第二层 modal 或新的平行状态解决本可在现有层级直接完成的动作。
