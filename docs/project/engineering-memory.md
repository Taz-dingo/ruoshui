# 工程记忆

最后更新：`2026-04-18`

## 目的

这份文档不是流水日志，而是若水广场的长期工程记忆。

只记录这些内容：

- 跨线程仍然容易重复踩到的坑
- 会影响默认开发/部署/验证路径的经验
- 已经足够稳定、值得回流到 skill 的规则

不记录这些内容：

- 纯一次性的临时操作
- 还没确认根因的猜测
- 已经过时、且不会再复现的历史噪音

## 使用规则

1. 遇到一个坑，如果它改变了默认做法，先记到这里
2. 如果它属于稳定专业域，同时更新对应 repo skill
3. 新线程恢复上下文时，优先阅读这份文档里的相关条目
4. commit 前做 cleanup 时，检查本轮是否有值得沉淀的新经验

## 推荐条目模板

```md
## YYYY-MM-DD - 标题

- 场景：
- 表象：
- 根因：
- 解决：
- 后续默认规则：
```

## 已沉淀经验

## 2026-04-18 - `forum-api` 本地启动前要先同步 `@ruoshui/shared` 产物

- 场景：在 workspace 里给 `packages/shared/src/forum-schema.ts` 增加 schema 后，直接启动 `services/forum-api` 的 `wrangler dev --local`。
- 表象：Worker 构建时报 `No matching export in "../../packages/shared/dist/index.js"`，前端随后出现 `127.0.0.1:8787` 连接拒绝和一串 `500`。
- 根因：`@ruoshui/shared` 的运行时导出指向被忽略提交的 `dist/`，而 `forum-api` 启动前没有自动重建它，导致源码与运行时产物漂移。
- 解决：把 `services/forum-api` 的 `dev`、`dev:node`、`build` 统一改成先执行 `pnpm --filter @ruoshui/shared build`，再启动或编译自身。
- 后续默认规则：只要 Node/Worker 侧消费 `@ruoshui/shared` 这类依赖 `dist/` 的 workspace 包，启动和构建脚本都要先同步依赖包产物，避免把构建报错误判成 Cloudflare 或前端问题。

## 2026-04-18 - Cloudflare Pages 不适合直接带大体积 `.sog`

- 场景：将 `web/` 前端直接部署到 Cloudflare Pages，并尝试把 viewer 所需的 `.sog` 模型一并打进产物。
- 表象：部署阶段会撞上 Pages 单文件大小限制，前端产物无法稳定发布。
- 根因：Pages 对单文件大小有限制，当前仓库里的 `hhuc-original.sog` 已超过可接受范围。
- 解决：把重模型移到 `R2`，构建时把生产元数据里的模型地址改写成公开 `R2` URL，不再把大模型随 Pages 静态产物一起发。
- 后续默认规则：Pages 只发前端壳和轻量静态资源，重量级 viewer 资产默认走 `R2`。

## 2026-04-18 - Raw Pages 资产上传必须显式设置 MIME

- 场景：使用自定义脚本通过 Pages 资产 API 上传前端产物，而不是完全依赖 `wrangler pages deploy`。
- 表象：访问 `pages.dev` 页面时出现空白页，浏览器把首页当成下载文件处理。
- 根因：上传脚本没有为 `.html` 显式设置 content type，`index.html` 落成了 `application/octet-stream`。
- 解决：在上传脚本里为 `.html`、`.css`、`.js` 等静态资源显式映射 MIME。
- 后续默认规则：只要不是走官方全托管上传流程，Pages 资产脚本必须自己维护 content-type 映射表。

## 2026-04-18 - 修复 Pages 错误元数据时要考虑内容哈希复用

- 场景：修复错误的 `index.html` 元数据后重新部署 Pages。
- 表象：部署成功，但线上行为仍像旧版本，修复看起来没有生效。
- 根因：Pages 资产按内容哈希复用，文件内容不变时可能继续指向之前带着错误元数据的资产记录。
- 解决：修复 metadata 类问题时，同时让目标文件内容发生变化，强制生成新哈希后再部署。
- 后续默认规则：如果修的是 Pages 资产元数据，而不是单纯业务内容，优先确认这次部署是否真的生成了新资产。

## 2026-04-18 - `wrangler` 失败不等于 Cloudflare 资源本身坏了

- 场景：用 `wrangler deploy`、`wrangler pages deploy` 或 `wrangler r2 object put --remote` 做 Cloudflare 发布。
- 表象：CLI 返回泛化的 `fetch failed`，但难以直接判断是权限、网络还是平台状态问题。
- 根因：`wrangler` 本地传输链路本身就可能失败，错误信息不足以直接定位到资源配置。
- 解决：先用 `wrangler whoami` 校验/刷新登录态；如果 CLI 仍不稳定，就切到 Cloudflare API 或 MCP 路径做上传、设置或状态检查。
- 后续默认规则：遇到 `wrangler` 泛化网络错误时，不要第一时间推翻现有配置，先验证账号状态，再切备用通道。

## 2026-04-18 - 本地访问 `workers.dev` 失败不能单独作为线上故障结论

- 场景：本地用 `curl` 或浏览器直接访问 `*.workers.dev` 判断 Worker 是否可用。
- 表象：本地看起来像是站点不可达，但 Cloudflare 侧部署状态又显示正常。
- 根因：当前网络环境下，`workers.dev` 的本地访问链路并不稳定，可能受 DNS 或网络路径影响。
- 解决：用 Cloudflare API / dashboard 状态、Pages 同源代理、或其他外部入口交叉验证，而不是只看一条本地访问链路。
- 后续默认规则：线上健康判断至少看两个信号源，本地直连 `workers.dev` 只能算参考，不算唯一真相。

## 2026-04-18 - Worker 设置补丁要优先准备 multipart 方案

- 场景：通过 Cloudflare API 更新 Worker settings，而不是从 `wrangler.toml` 重新完整发布。
- 表象：直接发 JSON patch 会被 API 拒绝，提示 content type 不符合要求。
- 根因：Worker settings 更新接口对请求格式有明确要求，部分路径需要 `multipart/form-data`，并在表单中带 `settings` 部分。
- 解决：改用 `multipart/form-data` 请求体发送 settings 更新。
- 后续默认规则：遇到 Worker settings API 更新失败时，优先检查接口要求的 content type，不要默认 JSON patch 一定可用。

## 2026-04-18 - `R2` 公网地址可访问，不代表浏览器跨域可直接取模型

- 场景：前端页面在 `pages.dev` 域名下直接 `fetch` `r2.dev` 上的 `.sog` 模型。
- 表象：资源 URL 单独打开似乎可访问，但浏览器内实际请求被 `CORS policy` 拦下，Viewer 报 `Failed to fetch`。
- 根因：`R2` bucket 开了公网域名，不等于已经配置了浏览器跨域头；对象“公开可下载”和“允许跨域脚本读取”是两回事。
- 解决：先给 bucket 补 `CORS` 规则恢复线上可用性；随后把生产主模型改成同源 `Pages Functions` 代理路径，避免把核心加载链路继续绑在跨域配置上。
- 后续默认规则：若 `web/` 前端要直接读取 `R2` 资源，先验证 CORS；对于超大模型等核心启动资源，优先走同源代理而不是直接跨域拉取。
