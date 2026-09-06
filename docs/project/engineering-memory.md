# 工程记忆

最后更新：`2026-09-06`

只记录会改变默认做法的短规则，不写长复盘。默认恢复项目时不要先读这份文档；只有 deploy、debug、验证链路或已知脆弱点相关任务才按需打开。

## 当前规则

- `2026-09-06`：生产 `forum-api` 默认使用根命令 `pnpm deploy:forum:prod`；它会先读取远端 D1 `d1_migrations` 并与 repo migration 文件精确比对。存在 pending migration 或远端未知 migration 时禁止 deploy；migration 必须先人工 review，再显式执行 `pnpm --filter @ruoshui/forum-api db:migrate:remote`。
- `2026-07-04`：恢复上下文先读 `docs/project/state.md`；只有前一层回答不了问题时才继续展开，`docs/archive/**` 永不默认加载。
- `2026-04-18`：只要 Node/Worker 侧消费依赖 `dist/` 的 workspace 包，启动和构建前先同步依赖包产物。
- `2026-04-18`：Cloudflare Pages 只发前端壳和轻量静态资源；重量级模型默认走 `R2 + Pages Functions` 同源代理。
- `2026-04-18`：不是走官方全托管上传时，Pages 资产脚本必须显式设置 MIME。
- `2026-04-18`：修 Pages 资产 metadata 时，要确认部署是否生成了新内容哈希。
- `2026-04-18`：`wrangler` 返回泛化网络错误时，先查登录态，再用 API 或其他通道交叉验证。
- `2026-04-18`：本地直连 `workers.dev` 不能单独作为线上故障结论。
- `2026-04-18`：Worker settings API 更新失败时，优先检查是否需要 `multipart/form-data`。
- `2026-04-18`：前端直接读取 `R2` 资源前先验 CORS；核心模型优先走同源代理。
- `2026-07-03`：重量级静态资源在仓库里只保留一份源文件，不长期提交重复副本。
- `2026-07-10`：运行时二进制（SOG、栅格图等）不进 Git；上传 R2 后通过 `/edge-models/*` 或 `/edge-media/*` 提供。
