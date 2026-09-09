# 当前任务

最后更新：`2026-09-09`

本文件只维护**当前执行顺序与执行者边界**。已经成立的事实写入 [`state.md`](state.md)，稳定产品 contract 写入 [`spec.md`](spec.md)，视觉 / 交互 contract 写入根目录 [`design.md`](../../design.md)，重要 rationale 写入 [`docs/decisions`](../decisions/)。

当前目标：生产技术闭环已经成立，下一阶段把若水从“能跑的产品骨架”推进成**空间发现、内容阅读与真实校园记忆真正统一的一版产品**。

执行者约定：

- **GitHub Agent**：适合 contract、数据模型、API / state seam、无主观性的结构改动、test / CI、code review。
- **本地 Agent**：适合需要真实浏览器 / DevTools / 3D 场景 / 鼠标轨迹 / 真机 / Cloudflare 凭证的实现与验收。
- **人**：最终判断 UI 手感、内容质量、真实 Place / Anchor 标定和取舍。

## P0：统一 Spatial Discovery 与内容层级

### A. GitHub Agent 可直接完成

- [x] 普通用户页面彻底退出旧 `HighlightLayer / ForumPost` 交互；旧 Highlight 仅保留在 `?admin=lab` / development。
- [x] 普通用户 Dock 增加一级「校园故事」入口，直接打开全校园 Published Story Feed / Detail。
- [x] Place 点击取消隐式 camera focus；点击只打开当前 Place 内容，显式「飞到这里」才使用保存的 camera pose。
- [ ] 对上述行为补最小 contract / component-level 回归验证，避免旧 Highlight 或自动 focus 重新进入生产主路径。
- [ ] 如 Story Anchor clustering 需要新的 shared view state / command seam，先提供最小、可测试的数据结构，不负责肉眼调参。

### B. 本地 Agent 更适合完成

- [ ] **Story custom Anchor 场景可发现性**：把已发布 custom Anchor 投影为轻量 Story Pin；只消费 Published Story，不暴露 draft / pending revision。
- [ ] **Anchor clustering**：按屏幕空间聚合 Story Anchor，Place 永远不被 cluster 吞掉。先以 48–64px 附近为实验起点，但最终以真实 3D 场景手感为准。
- [ ] cluster 点击：优先 focus / zoom 到该区域让 cluster 拆分；无法继续拆分时显示“这里有 N 段记忆”的 Glass Peek。
- [ ] Story Anchor Pin 点击：直接显示 Story 轻预览（cover / title / author / memoryTime / 摘要）+「飞到这里 / 阅读全文」，不增加“看图文”按钮。
- [ ] Place Peek / Feed 收敛为一个容器：点击 Place 后直接显示 intro + Story；没有 Story 时显示自然 empty state +「留下故事」。
- [ ] 删除 / 隐藏任何普通用户仍可到达的“看点位图文”“收起图文”“重复完整社区”旧交互。

### C. 人验收

- [ ] 同一位置只需要一次点击即可看到内容；不会“点一下飞、再点一下看图文”。
- [ ] 没有 Story 的 Place 看起来像产品 empty state，而不是开发占位页。
- [ ] 30+ custom Anchors 的场景仍可读，不被 pin 淹没；Place 始终优先。

## P1：材质系统落地

稳定设计 contract 已写入 [`design.md`](../../design.md)：`Scene → Glass Chrome → Paper Content → Focus Sheet`。

### A. GitHub Agent 可直接完成

- [ ] 审计 `web/src/styles/system.ts`，把含义混杂的 surface primitive 按 Glass / Paper / Focus Sheet 重新命名或拆分；不改视觉数值前先消除语义混乱。
- [ ] 将业务组件中重复的 Paper / Glass 基础样式逐步收口到 primitive，禁止继续散落新的颜色与 shadow recipe。
- [ ] 为“普通用户不显示 Admin Lab controls”“旧 Highlight 不进生产”补机械 gate（能测的部分）。

### B. 本地 Agent 更适合完成

- [ ] 做 Glass Peek → Paper Feed 的 **solidify transition**：同一容器材质从 translucent 过渡到 solid，不叠第二个 modal。
- [ ] 收敛 Paper UI：减少 My Stories / Feed 的 dashboard 感，优先 typography、留白、hairline，减少卡片套卡片。
- [ ] 收敛背景层级：主要用 dim / surface opacity / contrast，不再使用当前过重的全屏 blur。
- [ ] 逐屏调 Place Peek、Story Feed、Story Detail、My Stories、Composer 的 blur / dim / opacity，必须在真实校园背景上验收。

### C. 人验收

- [ ] Glass 只承载短暂空间控制，长内容不会被迫在复杂背景上阅读。
- [ ] Paper 出现时像“内容从场景中展开”，而不是突然跳到另一个 SaaS 页面。
- [ ] Story Feed 背后校园仍然明显可辨；Composer 可以更聚焦但不把场景糊成纯色。

## P2：首批真实 Place 与 Story

### 本地 Agent + 人

- [ ] 创建约 5 个正式 Place，若水广场优先；随后图书馆、操场、食堂等。
- [ ] 每个 Place 人工标定 marker / camera pose / intro / sort order，不虚构坐标。
- [ ] 准备真实照片和文案，围绕若水广场先生产一组代表产品气质的 Story。
- [ ] 完整跑一次真实内容链路：upload → Draft → submit → review / calibration → publish → Spatial Pin / Place Feed → Detail → 回到这里。
- [ ] 再扩到其余首批 Place，避免公共入口为空。
- [ ] 用真实内容检查卡片裁切、TextCover、标题 fallback、memoryTime 与图文密度。

## P3：生产 / 真机验收

### 本地 Agent

- [ ] 生产真实验证改邮箱：旧邮箱 OTP → 新邮箱 OTP → 当前 Session 保持 → 其他 Session 失效 → 新邮箱登录同一 User。
- [ ] iPhone Safari：viewport、safe area、横竖屏、Place / Anchor / cluster、rotate、pan、pinch、Bottom Sheet 与 3D 手势冲突。
- [ ] Android Chrome 与 iPad / 触屏核心链路。
- [ ] production acceptance：OTP、Draft 恢复、上传、thumbnail derivative、Review、Revision、My Stories、Like / Comment、空间返回、API / 图片 / 模型失败、Pages / Workers / D1 / R2 / SES。
- [ ] 每次 UI 变更后部署最新 Pages 并在生产域名验证，不能只看本地 Vite。

### 人

- [ ] 找少量真实校友做可用性测试；重点观察他们是否理解 Place / Story Anchor / 校园故事三个发现入口，以及投稿阻力。

## 已经完成，不再重复实现

- Email OTP / User / Session / 改邮箱代码；腾讯云 SES 真实 OTP smoke 已通过。
- D1 `0000–0003`、R2、Worker、Pages 生产主路径。
- Story Draft / media / autosave / custom Anchor Editor / Review / Revision / Published read。
- Place API / Admin Place Console / camera pose / ambient focus。
- Story Like / Comment / Reply / moderation。
- My Stories / owner media preview。
- thumbnail derivative + Loading。
- 旧 Forum 写路径与匿名 generic upload ticket 已关闭。
- 正式模型为完整 Single SOG；Streamed SOG / Perf HUD 仅实验入口。

## Later

- 多地点 Story；Anchor → Place 晋升机制。
- QQ / 微信 OAuth、用户主页、收藏、关注、私信、通知中心。
- 完整 User Ban / RBAC、评论图片和复杂 moderation。
- Story 搜索、复杂筛选、推荐算法。
- 校园外围 skyline / 粗模与更精细 X/Z navigation bounds。
- Streamed SOG / progressive rendering 的重新评估。
- D1 分页、索引、R2 孤儿对象清理和更完整媒体治理按真实规模补齐。

训练、旧 progressive runtime PoC 和旧 ForumPost 交互不再进入当前产品任务池。
