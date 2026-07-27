# HyperDesign

> 在线原型协作平台——上传 Axure / HTML 导出的原型 ZIP，自动解析页面目录，提供受控在线预览、标注评论与文件级权限管理。

## 快速开始

### 前置条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop)（Engine 29+ / Compose v2+）
- 可用端口 `8080`

### 一键部署

```bash
git clone https://github.com/<你的用户名>/hyperdesign.git
cd hyperdesign

# 复制环境变量模板（可根据需要修改）
cp backend/.env.example backend/.env

# 构建并启动
cd infra
cp .env.example .env
docker compose up -d --build
```

浏览器访问：**http://localhost:8080**

## 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `Demo123456` |
| 普通成员 | `chrisj` | `Demo123456` |

> 演示账号仅在首次启动时由 `prisma db seed` 创建，数据会持久化在 Docker 卷中。

## 功能概览

- 📦 **ZIP 上传与解析** —— 上传 Axure / HTML 导出的原型 ZIP，后台自动解析页面目录
- 👁 **受控在线预览** —— 基于文件级权限的 iframe 预览，安全沙箱保护
- ✏️ **评论与标注** —— 点击预览区域精确标注位置，创建评论与回复
- 📐 **Inspector 实时标注** —— DevTools 风格的元素检查器，显示尺寸与盒模型
- 🔗 **文件级分享** —— 生成受限分享链接，控制有效期与只读访问
- 👥 **团队与权限** —— 团队、成员、项目、文件级 `canView / canComment / canEdit` 权限
- 🐳 **Docker Compose 一键部署** —— 单机 Nginx + NestJS + SQLite，持久化存储

## 项目结构

```
hyperdesign/
├── backend/          # NestJS API (TypeScript + Prisma)
│   ├── prisma/       # Schema, seed data
│   ├── src/          # Controllers, services, modules
│   └── test/         # Unit & integration tests
├── frontend/         # React 19 + Ant Design 6 + Zustand
│   ├── src/          # Pages, components, stores
│   └── e2e/          # Playwright E2E tests
├── infra/            # Docker Compose & deployment config
│   ├── docker-compose.yml
│   └── .env.example
└── docs/             # Development records & deployment guides
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, Ant Design 6, Zustand, React Query, Vite |
| 后端 | NestJS 11, Prisma 6, Express Session |
| 数据库 | SQLite（本地/单机）, PostgreSQL（可切换） |
| 部署 | Docker + Nginx 反向代理 |

## 开发

### 后端

```bash
cd backend
cp .env.example .env    # 首次需要
npm install
npm run prisma:generate
npm run db:setup        # 建表 + 种子数据
npm start:dev           # http://localhost:3000
```

### 前端

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

### 运行测试

```bash
# 后端
cd backend
npm test                # 4 suites / 25 tests
npm run test:integration  # HTTP 集成测试

# 前端 E2E（需要后端运行在 3001 端口）
cd frontend
npx playwright test --project=chromium
```

## 生产部署

1. 使用 HTTPS 反向代理，设置 `APP_ORIGIN` 为实际域名
2. 设置 `SESSION_COOKIE_SECURE=true`
3. 生成强密码替换 `SESSION_SECRET`
4. 仅暴露 Web 端口（默认 `8080`），API 不映射到宿主机
5. 定期备份 Docker 卷 `hyperdesign-data` 和 `hyperdesign-storage`

详细说明见 `docs/HyperDesign-本地Docker部署指南.md`。

## 许可证

[MIT](LICENSE)
