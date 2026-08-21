# HyperDesign 开发任务进度记录

## 2026-08-21 - Redis 接入与分布式限流完成

### 完成内容

- [x] 接入 `ioredis`，新增全局 Redis 客户端模块，支持连接重试和优雅关闭。
- [x] 新增 Redis Lua 原子固定窗口计数器，避免并发请求下 `INCR` 与过期时间设置竞态。
- [x] 新增可复用 `@RateLimit` 装饰器与 Guard，并为登录接口启用按 IP + 用户名限流。
- [x] Redis 不可用时限流 fail-open，避免辅助基础设施故障阻断核心认证链路。
- [x] 健康检查增加 Redis 状态；Redis 故障时返回 `degraded`，MySQL 正常时 API 仍保持可用。
- [x] Docker Compose 新增 Redis 7、密码校验、健康检查、持久化卷和 API 依赖关系。
- [x] 配置 `trust proxy`，确保部署在 Web/Nginx 反向代理后时限流能够识别真实客户端 IP。

### 验证结果

```text
后端构建：passed
后端单元测试：6 suites / 39 tests passed
后端 lint：0 errors / 4 existing warnings
Docker 真实冒烟：MySQL、Redis、API、Web healthy
健康接口：database=ok，redis=ok
错误登录限流：前 10 次 401，第 11 次 429
```

### 当前边界

Redis 当前用于限流计数，不承担 Session、任务队列或对象存储职责。Redis Session、多实例 API、BullMQ 异步解析、MinIO/S3 和监控告警仍属于后续工程化切片。

## 2026-08-20 - 生产基础收口完成

### 完成内容

- [x] API 生产容器启动命令移除自动演示 seed，仅执行 `prisma migrate deploy` 后启动服务。
- [x] 新增 `prisma/init-admin.ts` 显式管理员初始化脚本：强制 5-64 位用户名、12-128 位强密码，拒绝密码包含用户名，拒绝覆盖已有账号。
- [x] 新增管理员初始化单元测试，覆盖凭据校验、密码哈希、超级管理员创建和重复账号保护。
- [x] 默认 Compose 强制 `MYSQL_ROOT_PASSWORD`、`MYSQL_PASSWORD` 非空，不再提供 `changeme` 回退。
- [x] 默认 Compose 不发布 MySQL 宿主机端口；新增 `docker-compose.dev.yml`，仅为本地集成测试绑定 `127.0.0.1:3306`。
- [x] Web 默认仅绑定 `127.0.0.1:8080`，由生产反向代理提供公网 HTTPS 入口。
- [x] README、MySQL 部署指南和部署前检查清单已更新为新的生产契约。

### 验证结果

```text
后端单元测试：5 suites / 36 tests passed
后端构建：passed
后端 lint：0 errors / 4 existing warnings
前端构建：passed（保留单个 510 kB chunk warning）
生产 Compose 静态校验：passed
开发 override Compose 静态校验：passed
空 MySQL 密码拒绝校验：passed
生产端口检查：MySQL 无宿主机端口，Web 仅 127.0.0.1:8080
开发端口检查：MySQL 仅 127.0.0.1:3306
管理员脚本 Docker 构建命令：生成 dist-admin/init-admin.js
隔离生产镜像构建与 Compose 启动：passed
全新数据库默认用户数：0
显式管理员创建、登录、会话恢复：passed
重复管理员初始化保护：passed（exit code 1）
API 容器重建后管理员登录：passed
Docker 生产形态 E2E：16 passed / 1 skipped / 0 failed
Prisma OpenSSL warning：已通过镜像安装 OpenSSL 消除
```

### 安全审计边界

`npm audit --omit=dev --audit-level=high` 报告 3 个 high，来源为 Prisma CLI 的 `@prisma/config` / `deepmerge-ts` 依赖链。自动修复会强制切换 Prisma 版本，因此未混入本次生产收口；需作为独立依赖安全切片评估、升级并完整回归。

评估结论：当前链路为 `prisma@6.19.3 -> @prisma/config@6.19.3 -> deepmerge-ts@7.1.5`。漏洞是 CVE-2026-40345，需要攻击者构造循环对象图并传入 deepmerge API；HyperDesign 业务 HTTP 请求没有直接调用该 API，主要风险位于生产镜像内 Prisma migration/config CLI 的输入面，直接公网可利用性较低但不为零。审计建议降级到 `prisma@6.12.0`，不属于安全补丁升级；当前 Prisma `7.9.1` 仍使用 `deepmerge-ts@7.1.5`，没有已验证的官方无破坏性修复。结论为中风险、非当前 P0 阻塞，禁止执行未经验证的 `npm audit fix --force`；后续单独评估 Prisma 7、CLI/API 镜像分离和依赖 override。

本次隔离生产冒烟使用独立 Compose 项目、MySQL 卷和临时存储目录；验证结束后已全部删除，没有改动原开发数据库和存储。

### 下一步

1. 独立评估 Prisma CLI 依赖审计风险，选择兼容版本并执行完整回归。
2. 在 Linux 服务器落实域名、HTTPS、存储目录、日志轮转以及 MySQL/文件备份恢复演练。
3. Redis 与分布式限流基础设施已于 2026-08-21 完成；后续进入 Redis Session / 异步任务队列与生产运维增强评估。

## 2026-08-19 - SQLite → MySQL 迁移 + Docker 部署就绪

### 任务背景

**正式部署需求确认**：
- 数据库：MySQL 8.0+（不再使用 SQLite）
- 部署环境：Linux 云服务器 + Docker Compose
- 文件存储：独立持久化目录，不存入数据库

### 完成任务列表

#### P0-1：SQLite → MySQL 迁移 ✅
- [x] 修改 Prisma Schema：`provider = "mysql"`
- [x] 验证字段类型兼容性（无 SQLite 特定依赖）
- [x] 创建 `.env.example` 模板
- [x] 更新 `backend/.env` 为 MySQL 连接串
- [x] 重新生成 Prisma Client
- [x] 启动 MySQL 8.0 Docker 容器（开发环境）
- [x] 授予 CREATE DATABASE 权限（Prisma shadow 数据库）
- [x] 运行 Prisma 迁移：`20260819082525_init_mysql`
- [x] 验证表结构：15 个表，utf8mb4 字符集
- [x] 导入种子数据：4 用户、4 团队、8 项目

**验证结果**：
```bash
npm run build     # ✅ 通过
npm test          # ✅ 通过 (4 suites / 28 tests)
npm run test:integration # ✅ 通过 (1 suite / 9 tests，独立 MySQL 测试库)
```

#### P0-2：文件存储路径改造 ✅
- [x] Prisma Schema 重构：`originalZipPath` + `extractedPath` → `storageKey`
- [x] 创建迁移：`20260819084122_refactor_storage_key`
- [x] 实现 `StorageService`（@Global 模块）
- [x] 改造上传逻辑：保存 `storageKey` 而非绝对路径
- [x] 改造预览逻辑：从 `storageKey` 计算路径
- [x] 改造删除逻辑：从 `storageKey` 计算路径
- [x] 修复测试文件：注入 `StorageService`
- [x] 编译验证：`npm run build` 通过

**架构改进**：
```
改造前（绝对路径，环境依赖）:
originalZipPath: /app/storage/uploads/file-123/original.zip
extractedPath: /app/storage/extracted/file-123/

改造后（相对 Key，环境无关）:
storageKey: uploads/file-123
→ 运行时通过 STORAGE_LOCAL_ROOT 动态计算绝对路径
```

**StorageService 核心方法**：
```typescript
generateStorageKey(fileId: string): string
  → 返回: uploads/{fileId}

getOriginalZipPath(storageKey: string): string
  → 返回: {STORAGE_ROOT}/uploads/{fileId}/original.zip

getExtractedPath(storageKey: string): string
  → 返回: {STORAGE_ROOT}/extracted/{fileId}
```

#### P0-3：Docker Compose 配置更新 ✅
- [x] 添加 MySQL 8.0 服务（健康检查 + 命名卷）
- [x] 更新 API 服务：MySQL 连接串 + 存储目录绑定
- [x] 更新 Web 服务：只读存储挂载
- [x] 创建 `infra/.env.example` 环境变量模板
- [x] 移除旧的 SQLite 数据卷和命名存储卷
- [x] 验证配置语法：`docker compose config` 通过

**新架构**：
```yaml
services:
  mysql:8.0 (port: 3306)
    └─> volume: hyperdesign-mysql (命名卷)

  api:nest (port: 3001)
    ├─> depends: mysql (healthy)
    └─> volume: ${STORAGE_HOST_PATH} -> /app/storage (读写)

  web:nginx (port: 8080)
    ├─> depends: api (healthy)
    └─> volume: ${STORAGE_HOST_PATH} -> /app/storage (只读)
```

#### P0-4：Docker Compose 冒烟测试 ✅
- [x] 修复 Dockerfile：`prisma db push` → `prisma migrate deploy`
- [x] 停止本地开发 MySQL 容器
- [x] 创建 `infra/.env` 开发配置
- [x] 构建镜像：`docker compose build` 成功
- [x] 启动服务：`docker compose up -d` 成功
- [x] 验证服务健康：
  - MySQL: healthy ✅
  - API: healthy (17秒) ✅
  - Web: running ✅
- [x] 验证数据库：迁移已应用，种子数据已导入
- [x] 验证 API：`/api/health` 返回 200
- [x] 验证登录：admin / Demo123456 登录成功
- [x] 验证前端：`http://localhost:8080` 可访问
- [x] 验证存储：容器内 `/app/storage` 正确挂载
- [x] 使用 Docker Web 容器执行完整 Playwright 回归：16 passed、1 skipped、0 failed

**测试结果**：
```
API 健康检查:
{"success":true,"data":{"status":"ok","database":"ok"}}

数据库:
- 15 个表全部创建
- 4 个用户 (admin, chrisj, mia001, leo001)
- 4 个团队
- 8 个项目

登录测试: ✅ 成功
前端访问: ✅ 200 OK
```

### 技术债务与已知问题

#### 已解决
1. ✅ Dockerfile 使用 `db push` → 已改为 `migrate deploy`
2. ✅ 测试文件使用旧字段名 → 已适配 `storageKey`
3. ✅ Prisma 迁移权限不足 → 已授予 CREATE 权限

#### 待处理（非阻塞）
1. ⚠️ OpenSSL 警告（Dockerfile 可添加 `apt-get install -y openssl` 消除）
2. ⚠️ Prisma 版本提示（6.19.3 → 7.9.1，需评估破坏性变更）
3. ⏳ 当前 MySQL、存储、删除功能和 ZIP Bomb 防护相关改动尚未完成审查与 Git 提交

### 新增/修改文件清单

#### 核心代码
```
backend/prisma/schema.prisma          # SQLite → MySQL
backend/src/storage/storage.service.ts # 新增：存储服务
backend/src/storage/storage.module.ts  # 新增：存储模块
backend/src/app.module.ts              # 注册 StorageModule
backend/src/prototype-spike.controller.ts # 适配 storageKey
backend/src/auth/current-user.service.ts  # 适配 storageKey
backend/test/share-viewer.integration-spec.ts # 适配 storageKey
backend/Dockerfile                     # 修正 CMD 命令
```

#### 配置与部署
```
backend/.env.example                   # 新增：环境变量模板
backend/.env                           # 更新：MySQL 连接串
infra/docker-compose.yml               # 重构：MySQL + 存储卷
infra/.env.example                     # 新增：Docker Compose 模板
infra/.env                             # 新增：本地开发配置
```

#### 数据库迁移
```
prisma/migrations/20260819082525_init_mysql/
prisma/migrations/20260819084122_refactor_storage_key/
```

#### 文档
```
docs/HyperDesign-Docker部署指南-MySQL版.md   # 完整部署指南
docs/HyperDesign-部署前检查清单.md            # 检查清单
memory/2026-08-19.md                          # 开发记录
```

### 当前状态

#### Docker 环境
**运行中**：
```
NAME            STATUS
infra-mysql-1   Up (healthy)
infra-api-1     Up (healthy)
infra-web-1     Up
```

**访问地址**：
- 前端：`http://localhost:8080`
- API：`http://localhost:8080/api/health`

**测试账号**：
- 用户名：`admin`
- 密码：`Demo123456`

#### 数据持久化
- MySQL 数据：Docker 命名卷 `infra_hyperdesign-mysql`
- 文件存储：宿主机目录 `./infra/storage`

### 下一步计划

#### 短期（本周）
1. 审查并提交当前工作区改动
2. 准备 Linux 云服务器部署材料（域名、HTTPS、备份策略）
3. 生产环境部署前安全检查

#### 中期（下周）
1. Linux 云服务器部署
2. HTTPS 证书配置（Let's Encrypt）
3. 监控告警系统搭建

#### 长期（未来迭代）
1. 对象存储支持（MinIO/S3）
2. Redis Session（多实例支持）
3. CI/CD 流程（GitHub Actions）

### 快速恢复指南

下次会话启动时：

```bash
# 1. 检查 Docker 环境状态
cd "HTML prototype/infra"
docker compose ps

# 2. 如果服务未运行，启动服务
docker compose up -d

# 3. 查看日志（如有问题）
docker compose logs -f api

# 4. 验证服务健康
curl http://localhost:8080/api/health

# 5. 结束时停止服务（可选）
docker compose down
```

### 团队协作提示

1. **环境变量配置**：
   - 复制 `infra/.env.example` 到 `infra/.env`
   - 修改数据库密码（不要使用示例密码）

2. **数据库连接**：
   - 开发环境：`mysql://hyperdesign:***@localhost:3306/hyperdesign`
   - Docker 环境：`mysql://hyperdesign:***@mysql:3306/hyperdesign`

3. **文件存储路径**：
   - 开发环境：`STORAGE_LOCAL_ROOT=./storage`
   - 生产环境：`STORAGE_LOCAL_ROOT=/app/storage`（容器内）

4. **端口映射**：
   - Web：`8080` → 前端页面
   - API：通过 Web (Nginx) 反向代理访问
  - MySQL：`${MYSQL_HOST_PORT:-3306}`（本地开发/独立集成测试使用；生产环境建议移除宿主机端口映射）

---

## 版本历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-08-19 | v1.0 | SQLite → MySQL 迁移完成，Docker 部署就绪 |
| 2026-07-24 | v0.9 | Sprint 6C E2E 验证完成 |
| 2026-07-22 | v0.8 | Sprint 6 完整功能验证 |

---

## 相关文档

- [Docker 部署指南（MySQL 版）](./HyperDesign-Docker部署指南-MySQL版.md)
- [部署前检查清单](./HyperDesign-部署前检查清单.md)
- [开发记录 2026-08-19](../memory/2026-08-19.md)
