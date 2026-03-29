# forum-api

若水广场的最小后端服务底座。

当前职责：

- 提供论坛与点位内容的 API 落点
- 承接数据库 schema 与后续迁移
- 抽象对象存储上传签名接口，便于后续接 `OSS`

当前不做：

- 完整登录与权限系统
- 审核流
- 正式的开放发帖社区规则

## 本地开发

```bash
pnpm install
pnpm dev:forum-api
```

默认端口：`8787`

已提供的最小接口：

- `GET /health`
- `GET /api/forum/bootstrap`
- `GET /api/storage/status`
- `POST /api/storage/upload-requests`
