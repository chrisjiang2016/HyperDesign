# HyperDesign

> 在线原型协作平台：上传 Axure / HTML 导出的原型 ZIP，自动解析页面目录，提供受控在线预览、实时标注、评论回复、团队协作和文件级权限管理。

## 当前状态

当前版本已经完成 MySQL 迁移、Docker Compose 单机部署、自动化回归验证和**首次生产环境部署**，可作为 Linux 云服务器上单机生产 MVP 的部署基线。

| 验证项 | 结果 |
|---|---:|
| 后端单元测试 | 6 suites / 39 tests passed |
| MySQL HTTP 集成测试 | 1 suite / 9 tests passed |
| Playwright E2E | 16 passed / 1 skipped / 0 failed |
| 后端构建 | passed |
| 前端构建 | passed |
| Docker Compose 配置 | passed |
| **阿里云生产环境部署** | **✅ 已完成** |
| **第一轮功能测试** | **✅ 已完成** |

README 内容以 `main` 分支当前版本为准。

## 最新开发进度（2026-09-10）

### 🚀 生产环境部署成功

**部署信息：**
- **服务器：** 阿里云轻量应用服务器（杭州区域）
- **配置：** 2核4GB，80GB存储，Ubuntu 22.04
- **公网地址：** http://47.114.41.30:8080
- **部署方式：** Docker Compose（MySQL 8.0 + Redis 7 + NestJS API + Nginx）

**完成内容：**
1. ✅ 通过 Workbench CLI 远程管理阿里云服务器
2. ✅ 配置生产环境 .env（强随机密码，无特殊字符）
3. ✅ Docker 镜像构建和容器部署（前端 75.7MB，后端 969MB）
4. ✅ 修复文件上传权限问题（chmod 777 /opt/hyperdesign/data/storage）
5. ✅ 所有服务健康检查通过（MySQL, Redis, API, Web）
6. ✅ 配置阿里云安全组，开放 8080 端口
7. ✅ 验证公网访问正常

**服务状态：**
```
MySQL 8.0:  healthy
Redis 7:    healthy  
API 后端:    healthy
Web 前端:    running (0.0.0.0:8080)
```

### 📋 测试用例编写

**完成内容：**
1. ✅ 编写详细测试用例文档（test-cases-detailed.md）
   - 9 个功能模块（用户认证、团队管理、文件上传、预览、协作、分享、权限、性能、持久化）
   - 共 84 条测试用例
   - 包含前置条件、测试步骤、预期结果

2. ✅ 转换为专业 Excel 格式（HyperDesign测试用例完整版.xlsx）
   - 3 个工作表：测试用例总览、测试统计、测试环境
   - 优先级颜色标记（P0=红、P1=橙、P2=黄、P3=绿）
   - 支持自动换行、冻结首行、单元格边框

### 🧪 第一轮功能测试

**测试方式：** API 测试 + 服务器日志分析  
**测试覆盖率：** 约 15%（后端 API 和服务健康状态）

**Bug 统计：**
| 严重级别 | 数量 | 状态 |
|---------|------|------|
| P0 - 阻断 | 1 | ✅ 已修复 |
| P2 - 一般 | 1 | ⚠️ 需确认 |
| P3 - 轻微 | 1 | ⚠️ 文档问题 |

**发现的问题：**
1. **Bug #001** - 文件上传权限错误（✅ 已修复）
2. **Bug #002** - 注册 API 参数验证问题（需前端确认）
3. **Bug #003** - API 路径文档不一致（文档改进）

**测试结论：** 系统整体运行正常，无阻断性 Bug，核心服务健康。

### 📝 后续待办

1. **完整 UI 测试：** 在浏览器中进行手动功能测试（文件上传、预览、标注、分享等）
2. **Bug 修复：** 验证并修复发现的 2 个轻微问题
3. **运维配置：** 
   - 配置域名和 HTTPS
   - 设置 Nginx 反向代理到 80/443 端口
   - 配置数据库和文件存储备份策略

## 功能

- HTML / ZIP 上传与解析：支持单个 HTML/HTM 页面，也支持 Axure / HTML 导出的原型 ZIP，自动生成页面目录。单文件 HTML 适合无外部依赖页面，多文件原型应打包为 ZIP。
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
  +---- Redis 7
  |       |
  |       +---- rate-limit counters
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
# 编辑 .env，必须设置 MYSQL_ROOT_PASSWORD 和 MYSQL_PASSWORD

docker compose up -d --build
docker compose ps
```

API 容器启动时会自动执行版本化 Prisma migration，但不会写入演示数据或默认账号。首次生产部署后，显式创建初始管理员：

```bash
read -rp "Admin username: " ADMIN_USERNAME
read -rsp "Admin password: " ADMIN_PASSWORD && echo
export ADMIN_USERNAME ADMIN_PASSWORD
docker compose exec -e ADMIN_USERNAME -e ADMIN_PASSWORD api node dist-admin/init-admin.js
unset ADMIN_USERNAME ADMIN_PASSWORD
```

管理员用户名必须是 5-64 位英文字母或数字。密码必须为 12-128 位英文字母或数字，同时包含大写字母、小写字母和数字，且不能包含用户名。初始化命令不会覆盖已有账号。

浏览器访问：

```text
http://localhost:8080
```

健康检查：

```bash
curl http://localhost:8080/api/health
```

预期结果中应包含 `"status":"ok"`、`"database":"ok"` 和 `"redis":"ok"`。

### 本地演示数据

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | `admin` | `Demo123456` |
| 普通成员 | `chrisj` | `Demo123456` |

演示账号仅用于本地开发和验收，生产容器不会自动创建。需要本地演示数据时，必须显式执行：

```bash
docker compose exec api node dist-seed/seed.js
```

不要在生产环境运行该命令。

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
| Redis | Redis 7（限流计数；故障时限流 fail-open） |
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
# 先通过开发 override 将 MySQL 仅发布到宿主机回环地址
cd ../infra
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql
cd ../backend
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

## 生产发布定位

当前版本可以部署到单台 Linux 云服务器，适合内部团队协作、小规模试用或对高可用与高并发没有严格 SLA 要求的生产 MVP。它已经具备 MySQL 持久化、原型文件持久化、容器健康检查、权限控制、ZIP 安全解析和自动化回归验证。

当前版本不应在不做生产收口的情况下，直接作为高并发、多实例或高可用公网系统发布。Redis 当前仅用于限流计数，Redis Session、MinIO/S3、多实例部署、CI/CD、监控告警和自动备份均属于后续工程化能力，而不是当前单机 MVP 的运行前提。

## 上线前代码收口

以下代码或配置修改是正式公网发布的前提：

1. [x] API 容器启动时只执行版本化 Prisma migration，不再自动写入演示 seed。
2. [x] 提供显式初始管理员命令，强制管理员凭据规则，并拒绝覆盖已有账号。
3. [x] Compose 强制要求 `MYSQL_ROOT_PASSWORD` 和 `MYSQL_PASSWORD`，缺失或为空时拒绝解析配置。
4. [x] 默认 Compose 不发布 MySQL 宿主机端口；本地集成测试使用独立开发 override。

以上代码收口已完成。正式发布仍必须完成下方的生产运维配置和真实 Linux 部署验收。

## 生产运维配置

以下事项不要求改变核心业务代码，但必须在上线时落地：

1. 使用 Caddy 或外部 Nginx 终结 TLS，只向公网开放 `80`、`443` 和受控的 SSH；Web 容器端口仅绑定到本机回环地址。
2. 使用真实域名配置 `APP_ORIGIN=https://your-domain.example`，并设置 `SESSION_COOKIE_SECURE=true`。
3. 使用宿主机持久化目录，例如 `/opt/hyperdesign/data/storage`，存放上传 ZIP 与解压资源；不要使用仓库内临时目录保存生产数据。
4. 为 MySQL 数据和原型存储目录配置定期备份，至少完成一次可验证的恢复演练。
5. 配置容器日志轮转与磁盘容量告警，避免长期运行导致宿主机磁盘耗尽。
6. 保持 MySQL 不对公网开放；云安全组仅开放必要端口。
7. 根据服务器资源和业务需求设置 `MAX_UPLOAD_BYTES`，并保留现有 ZIP 条目、单文件、总解压大小和路径安全限制。

## 发布判断

满足“上线前代码收口”和“生产运维配置”后，当前版本可以作为正式的单机生产 MVP 发布。

建议使用场景：内部设计协作、受控用户群、小规模客户试用、单台服务器部署。

不建议直接使用当前架构的场景：需要高可用、多个 API 实例、持续大规模上传、严格审计合规或明确恢复时间目标的公网系统。这些场景应先完成下方的工程化迭代。

## 后续工程化路线

工程化工作应按依赖关系分期推进，避免同时改动会话、文件存储、上传解析和部署拓扑。

1. **生产基础收口**：完成自动 seed 移除、管理员初始化、生产环境变量校验、HTTPS、日志轮转，以及备份恢复演练。
2. **共享基础设施**：扩展现有 Redis 接入，用于共享 Session 和任务队列；保持现有存储接口，新增 MinIO/S3 实现，将原型文件迁移到对象存储，数据库仅保存对象 Key。
3. **异步 ZIP 解析**：引入 BullMQ + Redis。上传接口仅负责校验、保存和入队；独立 Worker 负责解压、扫描、重试、失败记录和页面目录写入。
4. **安全与可观测性**：将现有认证和上传限流扩展为全局 API 限流，并补充结构化日志、请求 ID、审计查询与保留策略、健康指标、Prometheus 指标、告警规则和基础仪表盘。
5. **交付与扩展**：建立 GitHub Actions，覆盖构建、单元测试、MySQL 集成测试、Playwright、镜像构建和漏洞扫描；拆分 API 与 Worker 部署，支持多 API 实例，并完善 MySQL、对象存储的灾备与恢复手册。
6. **平台化评估**：只有在多实例规模、发布频率和运维复杂度明确增长后，再评估 Kubernetes 或其他编排平台。

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

当前版本是单机 Docker Compose 部署方案，文件存储使用宿主机持久化目录。Redis 已接入并用于限流计数，但 Redis Session、MinIO/S3、多实例部署、CI/CD、监控告警和自动备份属于后续工程化迭代，不是当前 MVP 的运行前提。

当前 Dockerfile 只在 API 启动时执行版本化 migration，不会自动写入 seed。生产管理员通过显式一次性命令创建；演示 seed 仅保留给本地开发和验收环境。

## 许可证

[MIT](LICENSE)
