# 若水广场

若水广场是一个以常州老校区为对象的 Web 数字纪念项目。当前以正式 `SOG` 场景为核心，主线是 viewer 体验、真实故事点位、社区笔记和 Cloudflare 交付。


## 开始工作

- 默认只读 [`docs/project/state.md`](docs/project/state.md)
- 需要决定下一步时再读 [`docs/project/tasks.md`](docs/project/tasks.md)
- 范围不清时再读 [`docs/project/spec.md`](docs/project/spec.md)
- 路线不清时再读 [`docs/project/plan.md`](docs/project/plan.md)
- 部署或排障时再读 [`docs/project/engineering-memory.md`](docs/project/engineering-memory.md)

开发前按 [`AGENTS.md`](AGENTS.md) 启用对应 repo skill；每轮保持小而完整，验证后提交并通过 PR 更新。

## 本地运行

```bash
pnpm install
pnpm dev:web
```

然后打开 `http://localhost:5173`。前端开发服务器会把 `/edge-models/*` 和 `/edge-media/*` 代理到 R2；如果要联调论坛 API，另开终端运行：

```bash
pnpm dev:forum-api
```

检查前端：

```bash
pnpm --dir web typecheck
pnpm --dir web build
```

## 发布

```bash
pnpm --dir web deploy:pages
```

发布前会自动构建 Pages、打包 Functions，并部署到 `https://ruoshui-web.pages.dev`。

生产 Auth / Worker 配置完成并部署后，用现有测试或管理员邮箱跑真实链路 smoke：

```bash
pnpm smoke:prod -- --email you@example.com
```

脚本会真实发送 OTP，并交互式读取验证码；随后验证 Pages → Worker 代理、HttpOnly Session、StoryDraft create / patch / 跨请求读取，最后 soft-delete 临时 Story 并 logout。它不会接受命令行 OTP，也不会提交公开 Story。更多参数见 `pnpm smoke:prod -- --help`。
