# HyperDesign Sprint 0 + Sprint 1 启动记录

> 日期：2026-07-15
> 状态：已完成首轮可运行骨架与 Spike / Auth 联调验证

## 已落地

### Sprint 0

- 初始化 `backend/`：NestJS + TypeScript + Prisma。
- 提供 `.env.example`、本地 SQLite 开发环境、Prisma schema、seed。
- 提供 `infra/docker-compose.yml`（PostgreSQL 16、Redis 7、MinIO）。
- 健康检查：`GET /api/health`。
- ZIP Spike：
  - 仅接受有效 ZIP signature 和 `.zip` 后缀；100MB 限制。
  - 路径规范化和 Zip Slip 拦截。
  - 解压后递归扫描 `.html/.htm`。
  - 读取 HTML title，自动识别入口页（根目录 index 优先）。
  - 受控预览资源路由，按会话和上传者进行授权校验。
  - 验证 HTML 与 CSS 资源可读取，路径穿越返回 400。

### Sprint 1

- Auth API：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/change-password`
- 密码使用 argon2 哈希；会话 token 以 HttpOnly Cookie 保存，服务端 session 入库。
- 前端接入：
  - Axios `withCredentials`。
  - Vite `/api` 开发代理。
  - 登录页接真实 API。
  - 注册页接真实 API。
  - 启动时 `/auth/me` 恢复会话。
  - 业务路由增加 `RequireAuth`。
  - Topbar / Settings 改为读取真实会话用户名。

## 验证证据

```text
backend: npm run build                  ✅
frontend: npm run build                 ✅
API smoke: health/login/me/upload/preview/path traversal ✅
```

Smoke Test 覆盖：

```text
health → 登录 admin → 获取当前用户
→ 上传含 index.html / CSS / 第二页面的 ZIP
→ 识别 2 个页面与入口页
→ 受控读取 index.html
→ 拦截 ../.env 路径遍历
```

## 开发账号

```text
admin / Demo123456
chrisj / Demo123456
```

## 本机环境阻塞项

当前开发机未安装 Docker、PostgreSQL、Redis（`docker`、`psql`、`redis-server` 均不可用）。

为了不阻断研发：

- 当前实现使用 SQLite 作为本地开发数据库。
- 已交付 PostgreSQL / Redis / MinIO Compose 定义。
- Sprint 2 前应安装 Docker Desktop 或提供可访问的 PostgreSQL、Redis 实例；届时将 Prisma datasource / Session 存储 / 队列切换到正式技术栈。

## 还未完成的事项

- ZIP 目前是 Spike 路由，尚未绑定团队、项目、文件夹和文件级权限；安排在 Sprint 2–4 接入。
- BullMQ 异步任务尚未启用；当前为同步解析验证。进入正式上传链路后迁移。
- Axure 复杂动态面板真实样例尚未提供，无法完成最终兼容性验证。
- 忘记密码页面仍是旧的邮箱验证码演示 UI，尚未按 V1 PRD 的“临时密码返回”流程替换。
