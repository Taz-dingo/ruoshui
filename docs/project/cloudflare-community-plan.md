# Cloudflare 图文社区与点位联动方案（草案）

最后更新：`2026-04-17`

## 1. 背景与目标

基于当前 `Web MVP` 已有的场景浏览、三维点位展示与 `forum-api` 最小后端底座，下一阶段明确新增两条产品目标：

1. 从“静态纪念展示”推进到“图文社区雏形”（类似小红书的图文流、详情与发布）。
2. 从 `Vercel` 主部署路径逐步迁移到 `Cloudflare` 生态，优先利用 `Workers + D1 + R2` 的低成本组合。

## 2. 本阶段要做什么（Scope In）

### 2.1 社区基础能力

- 图文帖子发布（标题、正文、封面、多图）
- 帖子列表与详情
- 点位关联（帖子可关联 `scenePin`，在场景内双向跳转）
- 最小交互能力：点赞、收藏、浏览计数（先做计数与聚合，不做复杂推荐）

### 2.2 基础审核与可见性

- 帖子状态：`draft / published / hidden / archived`
- 媒体状态：`pending / ready / blocked / failed`
- 管理侧最小操作：隐藏帖子、封禁媒体、撤销点位关联

### 2.3 Cloudflare 基建落地

- API Runtime：`Cloudflare Workers`
- 关系数据：`Cloudflare D1`
- 图像对象存储：`Cloudflare R2`
- 缓存与轻量配置：`Cloudflare KV`（仅缓存与配置，不做主业务库）

## 3. 暂不做（Scope Out）

- 完整算法推荐流
- 完整用户社交关系（关注、私信、圈子）
- 复杂风控与自动审核模型
- 管理后台的大而全内容运营系统

## 4. 目标架构

## 4.1 Monorepo 结构保持不变

- `web/`：前端场景与社区页面
- `services/forum-api/`：社区与点位 API（迁移到 Worker 运行时）
- `packages/shared/`：前后端共享 schema / type

## 4.2 数据与媒体流

1. 前端请求 `upload-ticket`
2. API 生成上传凭据（短时有效）
3. 前端直传 `R2`
4. 前端提交帖子（含媒体 key、点位关联）
5. API 写入 `D1`，并回传聚合视图数据

## 5. 数据模型补充建议

在现有 `scene / post / pin / media` 基础上，补以下实体或字段：

- `post_assets`：帖子与多图媒体关联（顺序、封面标记）
- `post_reactions`：点赞/收藏聚合（先做计数，用户维度可后补）
- `post_pin_links`：帖子与点位的多对多关联（兼容一个帖子关联多个点位）
- `moderation_logs`：最小审核操作记录（谁、何时、做了什么）

## 6. API 模块拆分（可并行）

## 6.1 内容域（Content）

- `POST /api/forum/posts`
- `GET /api/forum/posts`
- `GET /api/forum/posts/:id`
- `PATCH /api/forum/posts/:id`

## 6.2 媒体域（Media）

- `POST /api/storage/upload-requests`
- `POST /api/forum/media/confirm`
- `POST /api/forum/media/:id/moderate`

## 6.3 点位联动域（Pin Link）

- `POST /api/forum/post-pin-links`
- `GET /api/forum/scenes/:sceneId/pins/:pinId/posts`
- `GET /api/forum/posts/:postId/pins`

## 6.4 互动域（Engagement）

- `POST /api/forum/posts/:id/like`
- `POST /api/forum/posts/:id/favorite`
- `POST /api/forum/posts/:id/view`

## 7. 里程碑建议（两人并行）

## 里程碑 A：Cloudflare 迁移底座（1 周）

- 目标：保留当前接口 contract，先把 `forum-api` 运行在 `Workers`
- 输出：`D1` 可连接、`R2` 上传凭据可用、现有 bootstrap 接口可跑

## 里程碑 B：图文社区最小闭环（1-2 周）

- 目标：帖子发布、列表、详情、多图展示
- 输出：前端社区页 + 后端分页与详情 API + 媒体确认链路

## 里程碑 C：点位联动闭环（1 周）

- 目标：场景点位与帖子双向跳转
- 输出：点位详情可见关联帖子；帖子详情可反查关联点位并跳转镜头

## 8. 验收标准（Definition of Done）

- 至少 `1` 个场景完成“点位 -> 帖子 -> 点位”闭环
- 帖子支持 `>= 3` 张图片并稳定加载
- `Cloudflare` 生产环境可用，且不依赖 `Vercel` 特有能力
- 核心读写链路具备基础容错（参数校验、状态校验、资源不存在处理）

## 9. 风险与应对

- `D1` 免费额度对高频读写敏感：先建立分页、索引与缓存策略
- `R2` 上传链路易出现“对象已传但 DB 未写”一致性问题：通过 media confirm 与定时清理兜底
- 点位与帖子联动后复杂度上升：坚持先做“单场景单版本”闭环，再扩多场景
