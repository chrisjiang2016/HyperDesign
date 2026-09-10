# HyperDesign 项目概览

> **更新时间：** 2026-09-09  
> **来源：** docs/ 文档梳理 + memory/ 开发记录提取

---

## 一、项目定位

HyperDesign 是一个面向企业内部团队、支持私有化部署的 **HTML 原型分享与协作平台**，主要解决：

- HTML / Axure 原型上传与在线预览
- 团队、项目、文件夹和文件的层级管理
- 用户、团队成员和文件级权限控制
- 外部分享链接（支持密码保护和过期控制）
- Viewer 实时标注与 CSS/尺寸/颜色信息查看
- 原型区域评论、评论回复
- ZIP 安全解压、资源访问鉴权和 XSS 防护

---

## 二、当前技术架构

**实际采用方案**（已不同于早期规划）：

- **前端：** React 19 + TypeScript + Vite + Ant Design
- **后端：** NestJS 11 + TypeScript
- **ORM：** Prisma 6
- **数据库：** MySQL 8.0+
- **缓存与队列：** Redis 7（当前用于登录限流）
- **Web 服务器：** Nginx
- **部署：** Docker Compose
- **文件存储：** 独立持久化目录 `storage/`，数据库只保存元数据和 `storageKey`
- **原型预览：** 受控资源路由 + iframe
- **标注通信：** iframe Inspector + `postMessage`
- **测试：** Jest + Supertest + Playwright

**文件存储结构：**

```text
storage/
├── uploads/{fileId}/
│   └── original.zip (或 original.html)
└── extracted/{fileId}/
    ├── index.html
    └── ...
```

---

## 三、开发进度总结

### 已完成的主要功能（至 2026-08-24）

#### 核心功能
- ✅ SQLite → MySQL 迁移完成
- ✅ 文件存储路径重构完成（使用相对 storageKey）
- ✅ Docker Compose + MySQL 部署形态完成
- ✅ Redis 接入和分布式登录限流完成
- ✅ 单 HTML / HTM 文件上传与解析完成
- ✅ ZIP 上传、解析、页面目录和 Axure 兼容主链完成
- ✅ Viewer 预览、标注、评论和回复主链完成
- ✅ 分享链接创建、接受、只读访问和撤销完成

#### 测试验证
- ✅ 后端单元测试：6 suites / 40 tests passed
- ✅ MySQL 集成测试：1 suite / 9 tests passed
- ✅ 前端构建：passed
- ✅ Playwright E2E：16 passed / 1 skipped / 0 failed
- ✅ Docker 生产形态 E2E：passed
- ✅ Redis 限流验证：前 10 次 401，第 11 次 429

#### 最近三个重要里程碑

**2026-08-24：单 HTML 文件上传支持**
- 后端接口支持 `.html`、`.htm`、`.zip` 三种格式
- 单个 HTML 文件会自动生成入口页面记录并提取 `<title>`
- 验证通过：后端 build + 6 suites / 40 tests passed
- 发现并修复内网部署环境（192.168.1.231:8081）权限问题

**2026-08-21：Redis 限流接入**
- 完成 Redis 7 接入和全局限流
- 接入登录、注册、密码重置、改密、上传接口的 Redis 原子固定窗口限流
- Redis 故障时限流 `fail-open`
- 健康检查增加 `redis: ok/degraded`
- 已推送到 GitHub：
  - `842fa5a feat: add redis-backed rate limiting`
  - `927caf5 docs: refresh redis deployment notes`

**2026-08-19：README 更新与生产上线清单**
- 完成 README 更新，同步 MySQL 8.0 架构、真实测试结果和部署边界
- 已推送到 GitHub：`8c113dd docs: refresh README for MySQL deployment`
- 明确了正式公网生产上线前必须完成的 P0 改造清单

---

## 四、当前状态

### Git 状态
- **仓库：** https://github.com/chrisjiang2016/HyperDesign
- **分支：** main
- **最新提交：** `927caf5 docs: refresh redis deployment notes`
- **工作区状态：** 存在未提交改动（上传、存储、当前用户、团队页、项目页等业务代码修改）

### 部署状态
- **内网测试环境：** http://192.168.1.231:8081
- **健康状态：** MySQL ok, Redis ok（截至 2026-08-24）
- **已知问题：** 存储目录权限问题已识别，需要修复 `STORAGE_HOST_PATH` 权限

---

## 五、后续待推进事项

### 第一阶段：接手后的现状复核

1. ✅ 审查全部未提交 diff
2. ✅ 区分 OpenClaw 遗留开发改动与 WorkBuddy 新增记录文件
3. ⏳ 检查 `infra/.env`、`.gitignore` 和敏感信息
4. ⏳ 检查当前 Docker Desktop / Compose 服务状态
5. ⏳ 使用当前代码重新执行：
   - 后端 build
   - 后端 lint
   - 后端单元测试
   - MySQL 集成测试
   - 前端 build
   - Playwright E2E

### 第二阶段：发布前质量门禁

1. 补验证单 HTML 文件在 Docker 环境中的完整 HTTP 链路
2. 处理现有 E2E 的 1 个 skipped 用例
3. 补前端单元测试和边界异常测试
4. 独立评估 Prisma CLI 依赖链安全问题
5. 做依赖、镜像、构建产物和敏感信息检查
6. 审查并提交当前代码

### 第三阶段：Linux 生产上线（P0 改造清单）

#### 必须完成项
1. **禁止 API 容器启动时自动 seed**
   - 移除 Dockerfile 中的无条件 seed 执行
   - 增加 `RUN_SEED=false` 环境变量控制
   - 删除演示账号和演示数据

2. **禁止数据库密码使用默认值**
   - Compose 强制必填 `MYSQL_ROOT_PASSWORD` 和 `MYSQL_PASSWORD`
   - 使用强随机密码（不少于 32 位）

3. **配置 HTTPS 和真实域名**
   - 准备 Linux 云服务器和真实域名
   - 配置 Caddy / Nginx 终止 HTTPS
   - 设置 `APP_ORIGIN=https://domain` 和 `SESSION_COOKIE_SECURE=true`
   - 安全组只开放 22、80、443

4. **完成备份恢复演练**
   - MySQL 每日全量备份
   - storage 目录每日或增量备份
   - 异地或对象存储保留备份
   - 至少完成一次完整恢复演练

#### 强烈建议完成项（P1）
5. 增加登录暴力破解保护和 IP 限流
6. 增加 CSRF 防护或 Origin 校验
7. 增强 Web 安全响应头
8. 限制上传和解压资源的磁盘占用
9. 配置日志轮转、磁盘告警和监控

---

## 六、文档注意事项

- `docs/` 中存在早期文档与后续进度文档
- 部分早期描述仍写 SQLite/PostgreSQL/"未完成"
- **应以 2026-08-19 至 2026-08-24 的进度记录、MySQL 部署指南和部署检查清单为准**
- 本概览基于文档梳理和 memory 开发记录提取，没有修改现有开发文档
