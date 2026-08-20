# HyperDesign 部署前检查清单

## 数据库迁移检查

- [x] Prisma Schema 已从 `sqlite` 改为 `mysql`
- [x] 所有字段类型已验证兼容（String、Int、DateTime、Float、Boolean）
- [x] Prisma Client 已重新生成
- [x] 迁移文件已创建：
  - `20260819082525_init_mysql`
  - `20260819084122_refactor_storage_key`
- [x] 本地 MySQL 开发数据库已初始化并验证
- [x] 种子数据已导入（4 个用户、4 个团队、8 个项目）

## 代码改造检查

- [x] StorageService 已创建并注册为全局模块
- [x] `originalZipPath` 和 `extractedPath` 已合并为 `storageKey`
- [x] 上传逻辑已改造（使用 storageKey）
- [x] 预览逻辑已改造（从 storageKey 计算路径）
- [x] 删除逻辑已改造（从 storageKey 计算路径）
- [x] 所有测试文件已更新
- [x] `npm run build` 编译通过
- [x] `npm test` 单元测试通过

## Docker Compose 配置检查

- [x] 添加 MySQL 8.0 服务
- [x] 配置 MySQL 健康检查
- [x] API 服务的 `DATABASE_URL` 已改为 MySQL 连接串
- [x] 存储卷从命名卷改为目录绑定（`STORAGE_HOST_PATH`）
- [x] Web 服务添加只读存储挂载
- [x] API 服务依赖 MySQL 健康检查
- [x] 默认 Compose 不发布 MySQL 宿主机端口；本地测试通过 `docker-compose.dev.yml` 显式绑定 `127.0.0.1`
- [x] MySQL 密码环境变量缺失或为空时 Compose 拒绝解析
- [x] API 生产启动不再自动执行演示 seed
- [x] 提供拒绝覆盖已有账号的显式管理员初始化命令
- [x] 创建 `.env.example` 环境变量模板
- [x] `docker compose config` 语法验证通过

## 文档更新检查

- [x] 创建 MySQL 版本部署指南
- [x] 说明数据持久化架构
- [x] 提供生产环境配置建议
- [x] 记录故障排查方法
- [x] 提供 SQLite → MySQL 迁移步骤

## P0 任务 4：Docker Compose 冒烟测试

### Docker Compose 冒烟测试

- [x] 停止并清理现有开发环境容器
- [x] 使用 `docker compose build` 构建镜像
- [x] 使用 `docker compose up -d` 启动服务
- [x] 验证所有服务健康：MySQL healthy、API healthy、Web running
- [x] API 容器启动时执行数据库迁移；演示 seed 仅在本地验收时显式执行
- [x] 访问 `http://localhost:8080/api/health` 确认 API 可达
- [x] 访问 `http://localhost:8080` 确认前端可访问
- [x] 测试登录功能（admin / Demo123456）
- [x] 验证文件存储目录挂载：
  ```
  infra/storage/
  ├── uploads/{fileId}/original.zip
  └── extracted/{fileId}/...
  ```

### E2E 测试验证

- [x] 运行后端单元测试：`npm test`（5 suites / 36 tests）
- [x] 运行后端集成测试：`TEST_DATABASE_URL=mysql://hyperdesign:<密码>@localhost:${MYSQL_HOST_PORT}/hyperdesign_test npm run test:integration`（1 suite / 9 tests）
- [x] 验证完整 Playwright E2E 通过（16 passed，1 skipped，0 failed）

### 清理与提交

- [x] 停止本地开发 MySQL 容器：`hyperdesign-mysql-dev` 已移除
- [x] SQLite 测试数据库流程已移除；MySQL 集成测试使用 `hyperdesign_test` 独立库并在每次执行前重置
- [ ] 提交代码：
  ```bash
  git add .
  git commit -m "feat: migrate from SQLite to MySQL + refactor storage paths"
  ```

## 生产部署检查清单（参考）

### 环境准备

- [ ] 准备 Linux 云服务器（推荐 Ubuntu 20.04+）
- [ ] 安装 Docker 和 Docker Compose
- [ ] 创建持久化目录：`/opt/hyperdesign/data/storage`
- [ ] 配置防火墙（开放 80/443 端口）

### 配置调整

- [ ] 复制 `infra/.env.example` 到 `infra/.env`
- [ ] 设置安全的数据库密码：
  - `MYSQL_ROOT_PASSWORD`
  - `MYSQL_PASSWORD`
- [ ] 设置生产域名：`APP_ORIGIN=https://your-domain.com`
- [ ] 启用 Cookie Secure：`SESSION_COOKIE_SECURE=true`
- [ ] 设置存储路径：`STORAGE_HOST_PATH=/opt/hyperdesign/data/storage`
- [ ] 设置 Web 回环监听：`WEB_BIND_ADDRESS=127.0.0.1`

### 部署执行

- [ ] 上传代码到服务器
- [ ] 构建镜像：`docker compose build`
- [ ] 启动服务：`docker compose up -d`
- [ ] 确认 API 启动日志中的版本化 migration 成功
- [ ] 使用 `dist-admin/init-admin.js` 显式创建真实管理员
- [ ] 确认生产数据库中不存在 `Demo123456` 演示账号

### 反向代理配置

- [ ] 安装 Caddy 或 Nginx
- [ ] 配置 HTTPS 证书（Let's Encrypt）
- [ ] 配置反向代理到 `http://localhost:8080`
- [ ] 测试 HTTPS 访问

### 监控与备份

- [ ] 配置日志收集
- [ ] 设置 MySQL 自动备份（每日）
- [ ] 设置文件存储备份（每日）
- [ ] 配置服务监控告警

## 已知限制与优化方向

### 当前限制

- 单机部署（不支持水平扩展）
- 本地文件存储（不支持多实例共享）
- Session 存储在数据库（高并发场景需要 Redis）

### 优化方向

1. **对象存储支持**：集成 MinIO/S3，支持多实例部署
2. **Redis Session**：高并发场景下的 Session 共享
3. **CI/CD 流程**：GitHub Actions 自动构建和部署
4. **监控告警**：Prometheus + Grafana
5. **日志聚合**：ELK Stack 或 Loki

## 技术债务记录

### 代码层面

- [ ] 当前工作区改动待提交；提交前需完成构建、测试和敏感信息扫描

### 测试覆盖

- [x] 后端单元测试：5 suites / 36 tests
- [x] 后端集成测试：1 suite / 9 tests，分享访问完整生命周期
- [ ] 前端单元测试：待补充
- [x] E2E 测试：16 passed，1 skipped，0 failed

### 文档待完善

- [ ] API 接口文档（Swagger/OpenAPI）
- [ ] 开发环境搭建指南
- [ ] 贡献者指南

---

## 当前进度

**已完成**：
- ✅ P0 任务 1：SQLite → MySQL 迁移
- ✅ P0 任务 2：文件存储路径改造
- ✅ P0 任务 3：Docker Compose 配置更新
- ✅ P0 任务 4：Docker Compose 冒烟测试

**待完成**：
- ⏳ 当前工作区改动审查与 Git 提交
- ⏳ Linux 云服务器、HTTPS、备份和监控准备

**下一步**：
1. 审查并提交当前工作区改动
2. 准备生产服务器环境变量、HTTPS 和备份策略
3. 执行 Linux 云服务器实际部署
