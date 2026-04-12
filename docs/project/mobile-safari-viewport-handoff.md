# Mobile Safari Viewport Handoff

最后更新：`2026-04-13`

## 目标

当前要解决的不是“页面能不能滚动”，而是：

- 在 `iPhone Safari` 上，场景本身要视觉上填满上巴 / 下巴区域
- 不是只让背景色延伸进安全区
- 也不是靠脚本自动滚动把内容顶进去

用户已经多次明确：

- 滚动是否存在不是核心问题
- 核心是 `scene / canvas` 需要真正覆盖到可视区域上下两端

## 已尝试过的方向

### 1. 基础安全区与视口变量

做过：

- `meta` 侧加入过 `apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`
- 在 `web/src/style.css` 中使用过 `env(safe-area-inset-*)`
- 在 `web/src/main.tsx` 中同步 `visualViewport.height` 到 `--app-height`
- 对 `100vh / 100dvh / 100lvh` 做过切换和组合

结论：

- 这些改动能让页面背景或外层容器进入安全区
- 但不能单独保证 `scene canvas` 本身填满上下区域

### 2. 参考可占满页面的真实站点结构

做过：

- 参考过 `baidu.com` 这类能把内容铺到上下区域的页面结构
- 调整过外层 `html / body / #app` 的高度与 overflow 关系

结论：

- 这条线证明了“Safari 不是不能显示到上下巴区域”
- 真正的问题更像是我们自己的 scene / hud 分层和高度分配方式

### 3. 扩大 scene 外层容器

做过：

- 引入 `--layout-height`、`--scene-bleed`、`--scene-cover-height`、`--scene-cover-offset`
- 把 `scene-shell / scene-root / canvas` 做成比 `--app-height` 更高
- 当前结构已切到：
  - `#scene-shell`
  - `#scene-root`
  - `#hud-root`

结论：

- 这一步是有价值的
- 它至少证明了 scene 外层可以比 `innerHeight` 更高
- 但如果偏移分配不对，会出现“一边填满、一边还是空”的情况

### 4. HUD 跟着 scene 一起偏移

做过：

- 有一版把 HUD 也随 scene 一起整体偏移

结果：

- 底部可以填出来
- 但标题、小地图、点位 overlay 都会错位
- `hud-root` 在一次关键调试中变成了 `0,80 375x664`

结论：

- HUD 不能和被放大的 scene 使用同一套偏移
- HUD 需要继续锁在正常的 `app-height` 顶层覆盖层里

### 5. 继续单纯加大高度

做过：

- 多次增加 scene 的 cover 高度

结果：

- 用户反馈“高度都加到内部去了”
- 实际表现更像是 scene 内部拥有了更大的可滚动 / 可裁切空间
- 但真实可视区域顶部仍未被内容覆盖

结论：

- 不能再盲目只加高度
- 后续应优先调“高度如何分配到顶部和底部”，而不是只调总量

## 关键观测

### 一次重要调试数据

用户在 `IMG_0231.PNG` 对应版本上提供过关键现象：

- 下巴已经填满
- 上巴仍然空着
- 标题和地图出现错位

当时调试面板读到的值：

- `innerHeight: 664`
- `doc.scrollHeight: 824`
- `body.scrollHeight: 824`
- `scrollY: 0`
- `--app-height: 664px`
- `scene-shell: 0,0 375x824`
- `scene-root: 0,0 375x824`
- `scene-canvas: 0,0 375x824`
- `hud-root: 0,80 375x664`

这组数据的意义：

- `scene-shell / scene-root / canvas` 已经比 `innerHeight` 高
- 底部被填出来，不是“scene 没长高”
- 问题更接近 scene 的垂直分配或绘制覆盖位置
- HUD 下移是 overlay 错位的直接原因

### 另一个关键边界

用户后来多次确认：

- 某些版本里 `doc.scrollHeight` 会停在 `664`
- 但 `scene-shell / scene-root / canvas` 已经是 `704`

这说明：

- 页面文档高度和 scene 真正的绘制高度已经出现分离
- 问题不能只靠看 `document.scrollHeight`
- 需要继续盯 `scene-shell / scene-root / canvas / hud-root` 四个层级

## 当前代码侧事实

当前相关文件：

- `web/src/main.tsx`
- `web/src/app/App.tsx`
- `web/src/style.css`

当前保留的调试能力：

- `?debugViewport=1` 可打开 viewport debug overlay
- 已输出：
  - `innerHeight`
  - `visualViewport.height`
  - `visualViewport.offsetTop`
  - `doc.clientHeight`
  - `doc.scrollHeight`
  - `body.scrollHeight`
  - `scrollY`
  - `--app-height`
  - `scene-shell`
  - `scene-root`
  - `scene-canvas`
  - `hud-root`

当前结构约束：

- `scene-shell` 是放大的外层容器
- `scene-root` 是 viewer 实际挂载层
- `hud-root` 应保持为正常 `app-height` 的 overlay 层

## 当前判断

最可信的判断是：

- 这个问题已经不是单纯的 safe-area CSS 问题
- 也不是单纯的页面滚动问题
- 当前更像是“放大的 scene 与正常 HUD 之间，顶部覆盖分配仍不对”

换句话说，后续应该优先尝试：

1. 保留已放大的 outer scene 结构
2. 不再继续盲目增加总高度
3. 只调 scene 的垂直分配，尤其是顶部占比
4. HUD 继续固定在 `app-height` 覆盖层，不跟着 scene 偏移

## 明确不要再回去的方向

- 不要再做脚本自动滚动
- 不要把“能不能手动滚出来”当作主目标
- 不要只靠继续增大总高度来赌效果
- 不要再让 HUD 整体跟 scene 一起偏移

## 下一次接手时的建议步骤

1. 先用当前 `?debugViewport=1` 版本在真机复核四个矩形：`scene-shell / scene-root / scene-canvas / hud-root`
2. 如果还是“下巴满、上巴空”，优先改 scene 的 top / bottom 分配，而不是总高度
3. 保持 HUD 顶对齐，先确认标题 / 地图 / 点位 overlay 不再错位
4. 每次只做一个小改动，然后直接发 Vercel 真机验证

## 当前状态

- 问题未解决
- 但已排除一批无效方向
- 当前已经比最初更接近真正的结构性原因
