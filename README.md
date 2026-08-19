# HyperDesign

> 在线原型协作平台：上传 Axure / HTML 导出的原型 ZIP，自动解析页面目录，提供受控在线预览、实时标注、评论回复、团队协作和文件级权限管理。

## 当前状态

当前版本已经完成 MySQL 迁移、Docker Compose 单机部署和自动化回归验证，适合作为 Linux 云服务器部署基线。

| 验证项 | 结果 |
|---|---:|
| 后端单元测试 | 4 suites / 28 tests passed |
| MySQL HTTP 集成测试 | 1 suite / 9 tests passed |
| Playwright E2E | 16 passed / 1 skipped / 0 failed |
| 后端构建 | passed |
| 前端构建 | passed |
| Docker Compose 配置 | passed |

README 内容以 `main` 分支当前版本为准。

## 功能

- ZIP 上传与解析：支持 Axure / HTML 导出的原型 ZIP，自动生成页面目录。
- 受控在线预览：基于文件级权限的 iframe 预览，包含路径穿越校验和安全响应头。
- 实时标注与评论：在预览页面创建标注、评论和回复，刷新后数据仍然保留。
- Inspector：查看原型元素尺寸、位置和盒模型信息。
- 分享链接：创建、接受和撤销只读分享链接，可设置有效期。
- 团队与项目权限：支持团队、成员、项目和文件级 `canView`、`canComment`、`canEdit`、`canDelete` 权限。
- 文件清理：删除项目、团队或原型文件时同步清理 ZIP 和解压后的资源。
- ZIP 安全防护：限制条目数量、单文件解压大小、总解压大小，并拒绝路径穿越和不支持的条目类型。

## 架构

```text
Browser
  |
  v
Nginx Web :8080
  |
  v
NestJS API :3001 ---- MySQL 8.0
  |
  +---- /app/storage
          |
          +---- uploads/{fileId}/original.zip
          +---- extracted/{fileId}/...
```

MySQL 保存用户、团队、项目、原型文件元数据、页面目录、权限、标注、评论和分享链接。原始 ZIP 与解压后的 HTML/CSS/JavaScript/图片资源保存在独立的持久化文件目录中，不写入 MySQL。

## 快速开始

### 前置条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop) 或 Linux Docker Engine
- Docker Compose v2+
- 可用端口 `8080`；本地宿主机集成测试还可使用 `3306`

### 启动 Docker 环境

```bash
git clone https://github.com/chrisjiang2016/HyperDesign.git
cd HyperDesign/infra

cp .env.example .env
# 编辑 .env，至少修改 MYSQL_ROOT_PASSWORD 和 MYSQL_PASSWORD

docker compose up -d --build
docker compose ps
```

首次启动时，API 容器会自动执行版本化 Prisma migration 和 seed。浏览器访问：

```text
http://localhost:8080
```

健康检查：

```bash
curl http://localhost:8080/api/health
```

预期结果中应包含 `"status":"ok"` 和 `"database":"ok"`。

### 演示账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | `admin` | `Demo123456` |
| 普通成员 | `chrisj` | `Demo123456` |

演示账号仅用于本地开发和验收。当前容器启动命令会执行 seed；正式上线前必须调整 seed 策略，避免容器重启时重新写入演示账号凭据。

## 数据持久化

### MySQL

Docker Compose 使用 MySQL 8.0 和命名卷 `hyperdesign-mysql` 保存业务数据库。生产环境不应将 MySQL 端口暴露到公网；当前示例仅将本地开发端口绑定到 `127.0.0.1`。

### 原型文件

默认宿主机目录由 `STORAGE_HOST_PATH` 指定：

```text
storage/
├── uploads/{fileId}/original.zip
└── extracted/{fileId}/
    ├── index.html
    └── ...
```

Linux 生产环境建议：

```env
STORAGE_HOST_PATH=/opt/hyperdesign/data/storage
STORAGE_LOCAL_ROOT=/app/storage
```

原型文件目录必须和 MySQL 一起纳入备份策略。

## 项目结构

```text
HyperDesign/
├── backend/          # NestJS API、Prisma schema、migration、seed、测试
│   ├── prisma/       # Schema、版本化 migration、seed data
│   ├── src/          # Controllers、services、modules
│   └── test/         # MySQL HTTP integration tests
├── frontend/         # React 19、Ant Design 6、Zustand、Vite
│   ├── src/          # 页面、组件、状态和 API client
│   └── e2e/          # Playwright E2E
├── infra/            # Docker Compose 和环境变量模板
└── docs/             # 开发记录、部署指南和检查清单
```

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 19、Ant Design 6、Zustand、React Query、Vite |
| 后端 | NestJS 11、Prisma 6、Express Session |
| 数据库 | MySQL 8.0+ |
| 文件存储 | Docker 宿主机持久化目录，后续可适配 MinIO/S3 |
| 部署 | Docker Compose、Nginx |
| 测试 | Jest、Supertest、Playwright |

## 本地开发

推荐先使用 Docker Compose 验证完整链路。如果需要分别启动前后端，必须准备可用的 MySQL，并设置 `DATABASE_URL` 为 MySQL 连接串。

### 后端

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 测试

```bash
# 后端单元测试
cd backend
npm test

# MySQL HTTP 集成测试，需要指向独立测试库；每次运行会 reset 该库
TEST_DATABASE_URL="mysql://user:password@localhost:3306/hyperdesign_test" npm run test:integration

# Docker 环境完整 E2E，默认访问 http://127.0.0.1:8080
cd ../frontend
npx playwright test
```

PowerShell 设置测试数据库连接后运行：

```powershell
$env:TEST_DATABASE_URL = "mysql://user:password@localhost:3306/hyperdesign_test"
npm run test:integration
```

不要把 `TEST_DATABASE_URL` 指向生产数据库或开发数据数据库。

## Linux 生产部署

生产部署需要在 Linux 服务器上完成以下配置：

1. 安装 Docker Engine 和 Docker Compose Plugin。
2. 配置域名 DNS 指向服务器，并只开放 SSH、80、443。
3. 创建 `/opt/hyperdesign/data/storage` 并设置 `STORAGE_HOST_PATH`。
4. 从 `infra/.env.example` 创建生产 `.env`，设置 MySQL 强密码和真实 `APP_ORIGIN`。
5. 设置 `SESSION_COOKIE_SECURE=true`。
6. 通过 Caddy 或外部 Nginx 配置 HTTPS，并反向代理到 Web 容器。
7. 执行 `docker compose up -d --build`，确认 MySQL、API、Web 健康。
8. 配置 MySQL 和 storage 目录的定期备份，并完成一次恢复演练。

生产环境建议移除 Compose 中 MySQL 的 `ports` 映射，让数据库只通过 Docker 内网供 API 访问。

详细步骤和上线检查项：

- [MySQL Docker 部署指南](docs/HyperDesign-Docker部署指南-MySQL版.md)
- [部署前检查清单](docs/HyperDesign-部署前检查清单.md)
- [部署架构与文件存储结论](docs/HyperDesign-部署架构确认与文件存储结论_2026-08-19.md)

## 当前边界

当前版本是单机 Docker Compose 部署方案，文件存储使用宿主机持久化目录。Redis Session、MinIO/S3、多实例部署、CI/CD、监控告警和自动备份属于后续工程化迭代，不是当前 MVP 的运行前提。

当前 Dockerfile 会在 API 容器启动时执行 Prisma seed，适合本地开发和验收。正式生产部署前应移除自动 seed，改为仅在首次初始化时由管理员显式执行，并停用或更换所有演示账号凭据。

## 许可证

[MIT](LICENSE)
