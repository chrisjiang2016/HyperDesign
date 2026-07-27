# HyperDesign Sprint 6C：E2E 测试与部署准备

> 启动日期：2026-07-21  
> 状态：进行中

## 目标

完成 HyperDesign V1 的最后一个开发 Sprint，建立端到端自动化测试、补齐安全验证、完善部署方案，为正式发布做好准备。

## 任务清单

### 一、E2E 测试（Playwright）

#### 1.1 测试基础设施
- [x] 安装 Playwright 及浏览器驱动
- [x] 配置 E2E 测试环境（独立数据库）
- [x] 建立测试辅助函数（登录、等待、断言）
- [x] 配置截图与视频录制（失败时）

#### 1.2 核心流程用例
- [x] **用例 1：注册 → 登录 → 会话恢复 → 登出** (01-auth.spec.ts)
- [x] **用例 2：管理员创建团队 → 添加成员 → 授予项目权限** (02-team-project-permission.spec.ts)
- [x] **用例 3：普通成员仅看到授权项目；ProjectSwitcher 过滤** (02-team-project-permission.spec.ts)
- [x] **用例 4：上传 ZIP → 解析成功 → 页面目录可见 → iframe 预览** (03-upload-parse-preview.spec.ts)
- [x] **用例 5：无权限用户无法访问预览资源** (03-upload-parse-preview.spec.ts)
- [x] **用例 6：实时标注 Inspector 工作正常** (04-inspect-comment.spec.ts)
- [x] **用例 7：创建评论 → 回复 → 刷新后保留** (04-inspect-comment.spec.ts)
- [x] **用例 8：创建分享链接 → 外部用户接受 → 预览** (05-share-link.spec.ts)
- [x] **用例 9：撤销分享链接 → 访问被拒绝** (05-share-link.spec.ts)

### 二、安全测试

#### 2.1 已有安全措施验证
- [ ] ZIP 上传：Zip Slip 防护测试
- [ ] 预览资源：路径穿越防护测试
- [ ] 未授权资源访问测试
- [ ] XSS：评论内容脚本执行防护
- [ ] 会话：HttpOnly Cookie、SameSite 验证

#### 2.2 安全扫描
- [ ] 运行 npm audit（前端 + 后端）
- [ ] 依赖安全漏洞修复
- [ ] OWASP Top 10 检查清单

### 三、Docker Compose 部署方案

#### 3.1 容器化
- [ ] 前端 Dockerfile（nginx 静态服务）
- [ ] 后端 Dockerfile（Node.js）
- [ ] docker-compose.yml 完整配置
  - frontend
  - backend
  - postgres
  - redis
  - minio
  - nginx（反向代理）

#### 3.2 环境配置
- [ ] .env.example 模板
- [ ] 配置说明文档
- [ ] 健康检查端点验证
- [ ] 备份与恢复脚本

### 四、前端收尾

#### 4.1 响应式与交互
- [ ] 移动端适配检查（Viewer 主要流程）
- [ ] 空态统一检查（无项目、无文件、无权限、解析失败）
- [ ] Loading 状态统一检查
- [ ] 错误提示文案统一检查

#### 4.2 Viewer 回归
- [ ] 桌面模式预览
- [ ] 平板模式预览
- [ ] 移动模式预览
- [ ] 缩放功能
- [ ] 实时标注 Inspector
- [ ] 评论模式交互
- [ ] 页面切换

#### 4.3 性能优化
- [ ] Bundle 分析
- [ ] 按需加载验证
- [ ] 生产构建体积检查

### 五、文档与发布准备

#### 5.1 部署文档
- [ ] 安装前置条件
- [ ] 一键部署步骤
- [ ] 环境变量配置说明
- [ ] 常见问题排查

#### 5.2 用户文档
- [ ] 功能使用说明
- [ ] 权限模型说明
- [ ] 分享链接使用说明

#### 5.3 开发文档
- [ ] 项目结构说明
- [ ] 本地开发环境搭建
- [ ] API 文档（Swagger）
- [ ] 数据库 Schema 说明

## 验收标准

### 必须通过项
- [ ] 所有 E2E 用例在 CI 环境通过
- [ ] 无 P0/P1 安全缺陷
- [ ] Docker Compose 一键部署成功
- [ ] 核心流程无阻塞性 UI 问题
- [ ] 前端生产构建通过
- [ ] 后端生产构建通过
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过

### 可选优化项
- [ ] E2E 测试覆盖率 > 80%
- [ ] 前端 bundle size < 500KB（gzip）
- [ ] Lighthouse 性能评分 > 80
- [ ] 无障碍评分 > 90

## 当前状态

**2026-07-22 15:32 GMT+8 更新**
- 当前不再补 Sprint 5 功能本体，Sprint 5 已完成；继续推进 Sprint 6C 的收尾工作。
- 本轮优先处理 E2E / 安全 / 部署准备中的小块任务，采取“改一块、写一块、build 验证一块”的节奏，避免上下文继续膨胀。

**进度：9/9 核心 E2E 用例已编写**

### 4A 测试基线复核（2026-07-22）
- 后端 `npm run build` 通过。
- 后端单元测试通过：3 个 suite、18 个测试（认证、协作、分享服务）。
- 后端 HTTP 集成测试通过：1 个 suite、6 个测试，覆盖会话、创建分享、接受分享、只读访问与撤销后即时失效。
- Playwright 用例文件仍有 5 个 / 21 条，但其 `data-testid`、旧分享输入框和部分历史路由约定与当前重构后的前端 DOM 存在明显漂移；不能将“用例已编写”视为“当前版本已回归通过”。
- 下一小块：先校准认证、团队和项目主链的稳定测试契约，再实际执行对应 E2E；Viewer/协作/分享链路另行拆块，避免一次修复范围过大。

### 4B 最小 E2E 回归校准（2026-07-22）
- 范围限定为认证、团队与项目主链；本块未执行 Viewer、标注或分享页面用例。
- 校准了 3 类 Playwright 测试契约：认证页面路由切换后的表单初始值竞争、Ant Design 按钮文本中的间隔字符、左侧导航与正文重复名称造成的严格模式歧义。
- E2E 启动编排已修复：后端默认端口统一为 `3001`；`playwright.config.ts` 由 API 健康检查和 Vite 两个 `webServer` 共同托管，并显式固定 API 子进程 `PORT=3001`，避免宿主环境 `PORT=3000` 覆盖。
- 验证：在停止手工服务后，由 Playwright 自行启动 API 与前端执行：`npm run test:e2e -- e2e/01-auth.spec.ts e2e/02-team-project-permission.spec.ts --workers=1`，7/7 通过（16.5 秒）。
- 同轮构建：前端 `npm run build` 通过；后端 `npm run build` 通过。前端仍保留大于 500 kB 的 bundle warning，留待 4D 拆包处理。

### 4C 安全测试（2026-07-22）
- 依赖审计：前端与后端均执行 `npm audit --omit=dev --audit-level=high`，结果均为 `found 0 vulnerabilities`。
- ZIP / 资源路径：新增 `ZipParserService` 路径安全单元测试，拒绝 `../`、URL 编码 traversal、绝对路径、Windows 盘符与 NUL 字节；正常相对资源路径可用。
- 会话 Cookie：HTTP 集成测试验证 `hd_sid` 包含 `HttpOnly`、`SameSite=Lax`。`Secure` 由 `SESSION_COOKIE_SECURE=true` 控制，生产环境必须在部署配置中启用，留待 4D `.env.example` 固化。
- 预览资源：HTTP 集成测试验证匿名访问为 401、已登录路径穿越为 400；合法资源响应带 `Cache-Control: private, no-store`、`X-Content-Type-Options: nosniff` 与 sandbox CSP。
- 评论 XSS：前端静态检查未发现 `dangerouslySetInnerHTML`、`innerHTML` 或 `outerHTML`；评论和回复均以 React 文本节点输出，依赖 React 默认 HTML 转义。后端 DTO 同时限制评论/标注正文长度为 1–5000。
- 验证：后端 `npm test` 为 4 suites / 25 tests 通过；`npm run test:integration` 为 1 suite / 9 tests 通过；`npm run build` 通过。
- 本轮未做攻击面扩展：未引入真实恶意 ZIP 上传到开发目录，也未在浏览器 iframe 中执行脚本 payload；上述场景可作为后续安全扫描或 CI 增强项。

### 4D 性能拆包与部署物料（2026-07-22）
- 路由级拆包：认证、团队、项目、Viewer、分享和设置页改为 `React.lazy` + `Suspense`。原始单一入口约 1.25 MB；拆分后 Viewer 页面代码块约 27.5 kB、项目详情页面代码块约 11.5 kB，均不再阻塞首屏路由。
- 主链回归：路由拆包后执行认证/团队/项目最小 Playwright 集，7/7 通过。
- 依赖分组：构建产物已分离 React（95.1 kB）、React Query（24.7 kB）、HTTP（44.7 kB）和 Ant Design vendor。Ant Design 共享运行时约 997.6 kB，仍触发 Vite 500 kB warning；本轮不强行进行高耦合组件级拆分，后续可结合按需组件导入/Bundle Analyzer 专项处理。
- Docker 物料：新增前后端多阶段 Dockerfile、Nginx `/api` 反代、两服务 Compose、`.dockerignore`、`infra/.env.example` 和 `HyperDesign-本地Docker部署指南.md`。
- 部署边界：当前 Prisma schema 仍固定 SQLite，因此 Compose 交付为可持久化的单机 `api + web + SQLite volume`，未虚构 PostgreSQL/Redis/MinIO 已接入。数据库与上传目录使用独立 Docker volumes，API 不映射宿主端口。
- 验证：`docker compose --env-file .env.example config` 通过；前端、后端 `npm run build` 均通过。
- 环境阻塞：Docker CLI/Compose 已安装，但 Docker Desktop daemon 未启动（`docker info` 无法连接 `dockerDesktopLinuxEngine`），因此镜像构建、`docker compose up` 与容器健康检查尚未执行，待 Docker daemon 可用后补做。

### 已完成项

#### E2E 测试基础设施 ✅
- Playwright 已安装（v1.61.1）
- Chromium 浏览器驱动已下载
- playwright.config.ts 已配置
- helpers.ts 测试辅助函数已创建
- 测试夹具目录已创建
- package.json 测试脚本已添加

#### E2E 测试用例 ✅
1. **01-auth.spec.ts** - 用户身份认证流程（5个测试）
2. **02-team-project-permission.spec.ts** - 团队、项目与权限管理（2个测试）
3. **03-upload-parse-preview.spec.ts** - 文件上传、解析与预览（5个测试）
4. **04-inspect-comment.spec.ts** - 实时标注与评论功能（5个测试）
5. **05-share-link.spec.ts** - 分享链接功能（4个测试）

**总计：21 个测试用例**

#### 测试文档 ✅
- e2e/README.md - 完整的测试使用文档
- test-fixtures/README.md - 测试文件准备说明

### 下一步任务

1. **运行 E2E 测试验证**
   - 启动后端 API 服务
   - 运行测试并修复失败的用例
   - 补充 data-testid 属性（如需要）

2. **安全测试**
   - Zip Slip 防护验证
   - 路径穿越防护验证
   - XSS 防护验证
   - npm audit 扫描

3. **Docker Compose 部署方案**
   - 前端 Dockerfile
   - 后端 Dockerfile
   - docker-compose.yml
   - 环境配置模板
