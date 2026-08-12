# 若水广场 Design Contract

本项目以 [Apple reference DESIGN.md](docs/design/apple-reference/DESIGN.md) 为外部参考，执行版针对 3D 场景 viewer 做了裁剪。后续 UI 改动先读本文件，再读 reference；不要把 reference 的营销页结构直接复制到 viewer。

## Visual thesis

场景是唯一内容层，界面是几乎隐形的功能层：像 Apple 的电影感产品展示，但用 Liquid Glass 承载控制、导航和临时状态。

## Color roles

- 内容背景：场景原色，不用装饰性渐变制造氛围。
- UI 表面：中性黑、白、灰的透明材质；依靠透明度、模糊、亮度和 hairline 建立层级。
- 文本：深色背景上用白色和系统灰，避免彩色标签抢场景注意力。
- 唯一强调色：若水嫩叶绿 `#a8c97d` / `#c7e39e`，只用于主操作、状态、focus 和明确选中态；不为每个控件染色。
- 不使用树皮棕、青蓝、霓虹蓝或多色渐变作为 viewer UI 品牌色。

## Typography

- 字体优先使用 `SF Pro Display, SF Pro Text, system-ui, -apple-system, sans-serif`；非 Apple 平台回退 Inter。
- 标题用 600，不用粗重 700；显示字号使用轻微负字距。
- 正文保持可读，优先 14–17px 和约 1.45 行高；辅助信息可以小，但不能靠低对比度伪装层级。
- 字体层级少而稳定：标题、正文、caption、micro label。

## Layout and surfaces

- 场景 edge-to-edge；不放固定 hero 卡、常驻标题块或装饰性 dashboard。
- Liquid Glass 只用于功能层，内容层使用普通透明/标准材质。
- 控件优先 capsule / 44px touch target；面板使用 18–26px 圆角，避免卡片马赛克。
- 以留白、对齐和场景裁切建立层级，不以边框、阴影或渐变堆层级。
- 桌面和移动都只保留必要入口；移动端使用底部抽屉，适配 safe area。

## Viewer-specific rules

- 左上纪念标题区和右上小地图从生产 UI 隐藏；地图计算、热点投影和数据结构可以保留。
- 点位和社区内容是场景上的临时交互层，只在用户选择后出现。
- 常驻控制只负责模型版本、导览镜头和必要状态；实验诊断不进入生产界面。
- 动画短、稳、可逆：淡入、短距离滑动、按压缩放；禁止弹跳和持续装饰动画。

## Agent guardrails

- 修改 UI 前先复用 `web/src/styles/system.ts` 的 token 和 primitive，不在业务组件散落新颜色。
- 新增颜色前证明嫩叶绿和中性灰不够用；新增渐变前证明场景本身无法提供同样效果。
- 不新增设计依赖；优先 CSS backdrop blur、系统字体和现有 Radix primitives。
- 不把 Apple 的营销页产品 tile、导航栏或蓝色 CTA 直接照搬进 3D viewer。
