# HyperDesign API（Sprint 0 / Sprint 1）

## 已实现

- NestJS + Prisma 开发骨架
- SQLite 本地开发数据库（生产目标为 PostgreSQL）
- 健康检查：`GET /api/health`
- 注册、登录、登出、当前会话、重置密码、修改密码
- HttpOnly Cookie 会话（数据库 Session 实现；Redis 在容器化环境接入）
- ZIP Spike：安全路径校验、解压、HTML 页面扫描、入口页识别、受控资源读取

## 本地运行

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run db:setup
npm run start:dev
```

开发账号：`admin / Demo123456`

## Spike 接口

> 仅用于 Sprint 0 技术验证。正式上传接口会在 Sprint 3 迁移到项目/文件夹/文件权限上下文。

- `POST /api/files/spike-upload`，multipart 字段名 `file`
- `GET /api/files/:fileId/pages`
- `GET /api/preview/files/:fileId/resource?path=index.html`

## 环境限制

当前开发机未安装 Docker、PostgreSQL、Redis；因此已使用 SQLite 完成可运行开发与验证，并提供 `../infra/docker-compose.yml` 作为 PostgreSQL / Redis / MinIO 基础设施定义。开始 Sprint 2 前需要安装 Docker Desktop 或提供可用的 PostgreSQL、Redis 环境。
