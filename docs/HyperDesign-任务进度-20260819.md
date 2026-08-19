# HyperDesign 开发任务进度记录

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
