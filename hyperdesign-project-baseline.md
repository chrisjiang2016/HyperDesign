# HyperDesign 项目接手基线

> 接手时间：2026-09-09
> 目的：在 WorkBuddy 上继续既有 HyperDesign 的开发、测试与部署工作。

## 1. 产品是什么

HyperDesign 是一个面向企业内部团队、支持私有化部署的在线 HTML 原型协作平台。用户可以上传 AI 或 Axure RP 导出的 HTML 原型，系统解析页面目录并提供受控在线预览；团队成员可按权限访问、标注、评论和回复。

核心资源层级：

```text
用户 → 团队 → 项目 → 文件夹 → 原型文件 → HTML 页面
```

## 2. 产品目标

V1/MVP 的目标是打通：账号体系、团队与项目管理、HTML/ZIP 上传解析、Axure 原型预览、文件级权限、分享链接、实时标注、评论回复和安全访问。

明确不属于当前 MVP 的能力包括：版本管理、上传历史、评论解决状态、SSO/OAuth、通知、DOM 级评论定位、导出标注文档和高可用多实例架构。

## 3. 当前实际架构

- 前端：React 19、TypeScript、Vite、Ant Design、Zustand、React Query
- 后端：NestJS 11、TypeScript、Express Session
- ORM/数据库：Prisma 6、MySQL 8.0+
- Redis 7：当前用于登录限流，尚未承担 Session 或任务队列
- Web：Nginx
- 部署：Docker Compose，单机 `api + web + mysql + redis`
- 文件：独立持久化目录，数据库保存元数据与 `storageKey`
- 预览：受控资源接口 + iframe；资源访问需要权限校验
- 安全：Zip Slip、路径穿越、资源鉴权、安全响应头、XSS 防护、登录限流

## 4. 已完成基线

根据 README 和最新进度记录：

- SQLite 已迁移到 MySQL，版本化 Prisma migration 可执行。
- 已完成 StorageService，避免在数据库保存环境相关绝对路径。
- 已完成 Docker Compose、MySQL/Redis 健康检查和生产启动不自动 seed。
- 已提供显式管理员初始化脚本，拒绝覆盖已有账号。
- 已支持 `.html`、`.htm` 和 `.zip` 上传；多页面/带依赖原型仍应使用 ZIP。
- 已打通上传、解析、页面目录、Viewer、实时标注、评论回复和分享链接主链。
- 后端单元测试、MySQL HTTP 集成测试、Playwright E2E、前后端构建均有通过记录。
- 已记录的 Docker 生产形态 E2E：16 passed / 1 skipped / 0 failed。

## 5. 当前工程事实

Git 当前分支为 `main`，与 `origin/main` 对齐，但工作区存在未提交修改，涉及 README、上传/存储/当前用户后端代码、前端工作区/团队/项目页面和进度文档；另有本地 `.workbuddy/`、`memory/`、`overview.md` 等未跟踪内容。接手时不能直接覆盖或提交这些改动，必须先审查 diff、确认来源和敏感信息。

工程脚本：

- 后端：`npm run build`、`npm test`、`npm run test:integration`、`npm run lint`
- 前端：`npm run build`、`npm run lint`、`npm run test:e2e`
- 部署：`infra/docker-compose.yml`，开发数据库端口使用 `docker-compose.dev.yml`

## 6. 接下来执行顺序

### P0：先做现状复核

1. 审查未提交 diff 与未跟踪文件，确认哪些是既有开发改动、哪些是本次 WorkBuddy 产生的记录文件。
2. 检查 `infra/.env`、Git 忽略规则和敏感信息，禁止把真实密码、Cookie 或生产配置提交到仓库。
3. 检查 Docker Desktop/Compose 当前状态和服务健康状态。
4. 用当前代码重新执行 build、lint、后端单测、MySQL 集成测试和 E2E，避免只相信历史记录。

### P1：补齐发布前质量门禁

1. 完成单 HTML 上传在 Docker 环境的 HTTP E2E：登录 → 上传 → 解析 → Viewer → 资源访问。
2. 处理 E2E 中现存的 skipped 用例，决定是补充 fixture 还是明确记录为有条件跳过。
3. 补充前端单元测试与关键异常/边界测试。
4. 完成 `npm audit --omit=dev --audit-level=high` 中 Prisma CLI 依赖链的独立评估，不执行未经验证的 `audit fix --force`。
5. 进行敏感信息扫描、依赖锁定、构建产物和镜像检查。

### P1：真实 Linux 上线

1. 准备 Linux 云服务器、域名、DNS、HTTPS 和防火墙规则。
2. 配置 `infra/.env`：强密码、真实 `APP_ORIGIN`、`SESSION_COOKIE_SECURE=true`、`STORAGE_HOST_PATH=/opt/hyperdesign/data/storage`。
3. Web 仅监听回环地址，公网仅开放 80/443/受控 SSH，MySQL/Redis 不公网暴露。
4. 执行 Compose 构建、migration、健康检查和显式管理员初始化。
5. 配置 MySQL 与文件存储每日备份，完成一次恢复演练。
6. 配置日志轮转、磁盘告警、服务监控和回滚步骤。

### P2：后续工程化

- Redis Session 与多实例 API
- BullMQ/异步解析任务
- MinIO/S3 对象存储
- CI/CD
- OpenAPI/Swagger、开发者指南、贡献者指南
- 更完整的审计、监控和高可用能力

## 7. 发布判断

当前版本适合作为单台 Linux 服务器上的生产 MVP，适用于内部协作、小规模试用和受控客户群。完成真实 Linux 部署、HTTPS、备份恢复、日志监控和依赖风险处置后再正式对外发布。不应直接宣称支持高并发、多实例、高可用或严格合规场景。

## 8. 重要文档索引

- `readme.md`：当前项目总览与运行说明
- `docs/HTML原型分享平台_PRD_v1.0.md`：产品需求基线
- `docs/HTML原型分享平台_技术架构与数据库设计_v1.0.md`：架构与数据模型
- `docs/HTML原型分享平台_API接口设计_v1.0.md`：接口设计基线
- `docs/HyperDesign-任务进度-20260819.md`：最新研发进度
- `docs/HyperDesign-Docker部署指南-MySQL版.md`：部署操作手册
- `docs/HyperDesign-部署前检查清单.md`：上线检查项
