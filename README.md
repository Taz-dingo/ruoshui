# 若水广场

若水广场（Ruoshui）是一个以 **3D 校园为入口的数字记忆空间**。

它尝试把照片、文字和讨论重新放回记忆发生的地点：用户可以在 3D 校园中发现 Place 与 Story Anchor，阅读校友留下的 Story，也可以从 Story 回到对应的空间位置。

**在线体验：** https://ruoshui.tazdingo.net

## 核心体验

- **3D 校园**：基于 PlayCanvas 与 Gaussian Splatting / SOG 的 Web 场景。
- **空间发现**：Place、Story Anchor 与屏幕空间聚合共同组成内容入口。
- **校园 Story**：支持文字、照片、时间和地点，既可以从场景进入，也可以通过全校园 Feed 浏览。
- **社区互动**：Email OTP 登录、个人资料、点赞、评论与回复。
- **投稿与审核**：Draft、自动保存、位置标定、Revision 与发布审核形成完整内容链路。
- **渐进式内容界面**：以 `Scene → Glass Chrome → Paper Content → Focus Sheet` 组织空间探索、阅读与编辑。

## 技术栈

| 层 | 技术 |
| --- | --- |
| Web | React · TypeScript · Vite |
| 3D | PlayCanvas Engine · SOG |
| API | Hono |
| Runtime | Cloudflare Pages · Workers |
| Data | D1 · R2 |
| Workspace | pnpm |

## 项目结构

```text
web/                  Web viewer 与内容 UI
services/forum-api/   Hono API、Workers、D1 migrations
packages/shared/      前后端共享 schema / types
docs/                 产品、设计与工程决策
scripts/              验证、smoke 与部署辅助脚本
```

稳定的产品边界见 [`docs/project/spec.md`](docs/project/spec.md)，视觉与交互约束见 [`design.md`](design.md)。参与开发的 Agent / contributor 请先阅读 [`AGENTS.md`](AGENTS.md)。

## 本地开发

需要 Node.js 与 pnpm（仓库当前使用 `pnpm@11.7.0`）。

```bash
pnpm install
pnpm dev:web
```

默认 Web 开发地址为 `http://localhost:5173`。

需要联调 API 时，在另一个终端运行：

```bash
pnpm dev:forum-api
```

本地敏感配置请从示例文件复制后自行填写，不要提交真实凭据：

```bash
cp services/forum-api/.dev.vars.example services/forum-api/.dev.vars
```

## 验证

```bash
pnpm check
```

`pnpm check` 会运行类型检查、API tests、若水特有的 contract / regression gates，以及生产构建。

## 部署

生产环境采用 Cloudflare Pages + Workers + D1 + R2。仓库只保存可公开的配置和示例；账号标识、密钥、token 等运行时敏感值必须在部署环境中配置，不进入 Git。

部署与生产验证脚本属于维护者工作流，具体约束见 [`docs/project/engineering-memory.md`](docs/project/engineering-memory.md)。

## 项目状态

若水仍在持续迭代。当前重点是空间发现、内容阅读、个人资料与真实设备体验，而不是构建一个通用论坛或完整社交网络。

如果你只是想看看项目，直接打开在线体验即可；如果你想研究实现，可以从 `web/`、`services/forum-api/` 和 `docs/decisions/` 开始。
