# HyperDesign 今日开发任务记录（2026-07-22）

## 今日目标

在前序 Sprint 0–5 核心能力完成的基础上，完成：

1. Viewer 协作与分享主线接入真实后端能力；
2. Sprint 6 收尾：测试基线、最小 E2E、安全验证、性能拆包、Docker 部署物料；
3. 保持改动分块交付，避免将 E2E、安全、性能和部署混为一次大范围修改。

---

## 一、阶段 3C：Viewer 协作主线收口

### 完成内容

- Viewer 接入统一的加载、错误、无可预览页面状态。
- 保持项目、文件、页面目录、文件权限、受控 iframe 预览继续走真实 API。
- 将已有协作 API 接回 Viewer：
  - 加载当前页面标注；
  - 创建位置锚点并持久化；
  - 新增评论/回复并持久化；
  - 操作后刷新当前页协作数据；
  - `canComment` 继续约束评论入口。
- 顶栏、缩放、收起面板、评论、导出、分享等入口统一使用 Ant Design 图标。

### 验证

- 前端 `npm run build` 通过。

### 保留项

- 真实 iframe 中的 Axure 动态面板、页面跳转和 Inspector 注入互不干扰的浏览器级验证，留待后续 Viewer E2E 专项执行。

---

## 二、阶段 3D：文件级分享主线

### 后端真实契约

分享能力以**原型文件**为粒度，非整个项目：

- 创建者须为上传者或拥有 `canEdit` 权限；
- 链接有效期为 1–30 天；
- 分享对象需要登录后接受；
- 接受后仅获得只读 Viewer 权限；
- 支持撤销，撤销后立即失效。

### 前端完成内容

- Viewer 分享管理弹窗接入真实 API：
  - 创建分享链接；
  - 自动复制链接；
  - 查看到期时间和接受次数；
  - 撤销链接。
- 新增分享接受页：`/shares/:token`。
  - 先校验链接；
  - 引导登录并接受；
  - 接受后跳转受控 Viewer；
  - 无效、过期、撤销链接显示统一错误状态。
- 项目详情页为解析成功且有编辑权限的原型文件增加“管理分享”入口，跳转 Viewer 并自动打开分享管理。

### 未伪造的能力

现有后端不支持，前端没有虚构：

- 匿名预览；
- 分享密码；
- 可评论分享；
- 自定义访问次数上限。

### 验证

- 前端 `npm run build` 通过。

---

## 三、Sprint 6 / 4A：测试基线复核

### 后端基线

| 项目 | 结果 |
|---|---:|
| `npm run build` | 通过 |
| 单元测试 | 3 suites / 18 tests 通过（基线时） |
| HTTP 集成测试 | 1 suite / 6 tests 通过（基线时） |

基线集成测试已覆盖会话、分享创建、接受、只读 Viewer 访问及撤销后即时失效。

### E2E 盘点结论

- Playwright 保留 5 个 spec、21 条用例。
- 当前重构后的页面与历史用例存在 DOM 契约漂移（旧 `data-testid`、旧分享输入框、重复文本选择器等）。
- 因此“用例文件存在”不能等同于“用例已通过”，需要分主链校准。

---

## 四、Sprint 6 / 4B：最小 E2E 回归校准

### 校准范围

仅处理认证、团队、项目主链：

1. 注册 → 登录 → 会话恢复 → 登出；
2. 未登录访问拦截；
3. 错误凭据与注册校验；
4. 管理员创建团队 → 进入团队 → 创建项目；
5. 普通用户访问不可访问项目的接口拦截。

Viewer、标注、分享浏览器 E2E 没有混入本块。

### 修复内容

- 统一 E2E API 端口：后端默认端口调整为 `3001`，与 Vite `/api` 代理一致。
- `playwright.config.ts` 由 API 健康检查和 Vite 两个 `webServer` 管理。
- 明确将 Playwright API 子进程设为 `PORT=3001`，避免宿主环境的 `PORT=3000` 覆盖。
- 校准认证路由切换后 Ant Design 表单初始值与测试输入的时序。
- 校准 Ant Design 按钮可访问名称中的间隔字符。
- 校准导航与正文出现同名团队时的 Playwright 严格模式歧义。

### 验证

停止手工服务后，让 Playwright 自行启动 API 和 Vite：

```bash
npm run test:e2e -- e2e/01-auth.spec.ts e2e/02-team-project-permission.spec.ts --workers=1
```

结果：**7/7 通过（16.5 秒）**。

---

## 五、Sprint 6 / 4C：安全测试

### 依赖审计

| 命令 | 结果 |
|---|---:|
| 后端 `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| 前端 `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |

### ZIP 与路径安全

- ZIP 解压与预览资源均经过 URL 解码、路径规范化与根目录边界校验。
- 新增 `ZipParserService` 安全单元测试，拒绝：
  - `../`；
  - URL 编码路径穿越；
  - 绝对路径；
  - Windows 盘符；
  - NUL 字节。
- 正常相对原型资源路径可以继续访问。

### Cookie 与受控预览

- 会话 Cookie `hd_sid` 已验证包含：
  - `HttpOnly`；
  - `SameSite=Lax`。
- `Secure` 由 `SESSION_COOKIE_SECURE=true` 控制，生产部署须开启。
- HTTP 集成测试验证：
  - 匿名预览资源访问为 `401`；
  - 登录后路径穿越访问为 `400`；
  - 合法预览响应包含：
    - `Cache-Control: private, no-store`；
    - `X-Content-Type-Options: nosniff`；
    - sandbox CSP。

### 评论 XSS 检查

- 前端未发现 `dangerouslySetInnerHTML`、`innerHTML` 或 `outerHTML`。
- 评论与回复通过 React 文本节点输出，依赖默认 HTML 转义。
- 标注/评论 DTO 均限制正文长度为 1–5000。

### 验证

| 项目 | 结果 |
|---|---:|
| 后端单元测试 | 4 suites / 25 tests 通过 |
| HTTP 集成测试 | 1 suite / 9 tests 通过 |
| 后端 `npm run build` | 通过 |

本轮未向开发目录上传真实恶意 ZIP，也未在 iframe 中执行攻击脚本；这两类可作为未来 CI 安全增强项。

---

## 六、Sprint 6 / 4D：性能拆包

### 实施

- 路由页全部改为 `React.lazy` + `Suspense`：
  - 认证；
  - 团队与团队详情；
  - 项目详情；
  - Viewer；
  - 分享接受页；
  - 用户设置。
- Vite 构建中分离 React、React Query、HTTP 和 Ant Design 依赖组。

### 构建结果

- 优化前：单一入口 JS 约 **1.25 MB**。
- 优化后：
  - Viewer 代码块约 **27.5 kB**；
  - 项目详情代码块约 **11.5 kB**；
  - React vendor 约 **95.1 kB**；
  - React Query vendor 约 **24.7 kB**；
  - HTTP vendor 约 **44.7 kB**。
- 路由级拆包后，4B 最小 E2E 主链仍为 **7/7 通过**。

### 已知性能风险

- Ant Design 共享 vendor 约 **997.6 kB**，仍触发 Vite 的 500 kB warning。
- 本轮未采用高耦合的强制组件级拆分；建议后续单开 Bundle Analyzer / AntD 按需组件加载专项处理。

---

## 七、Sprint 6 / 4D：Docker Compose 与部署物料

### 新增文件

```text
backend/Dockerfile
backend/.dockerignore
frontend/Dockerfile
frontend/nginx.conf
frontend/.dockerignore
infra/docker-compose.yml
infra/.env.example
docs/HyperDesign-本地Docker部署指南.md
```

### 部署架构

```text
Web (Nginx) → /api 反代 → NestJS API → SQLite 持久卷
                                  └── 原型 ZIP / 解压资源持久卷
```

### 关键决策

当前 Prisma schema 的 datasource 仍为 SQLite。因此本次 Compose 是**真实可运行的单机 `api + web + SQLite volume` 部署**：

- 数据库与原型存储使用独立 Docker volumes；
- API 不映射到宿主机端口，仅由 Nginx 反代；
- API 健康检查调用 `GET /api/health`；
- 给出环境变量、HTTPS、Cookie Secure、备份恢复、更新与停止说明。

没有将尚未适配的 PostgreSQL、Redis、MinIO 伪装为已完成接入。多实例和上述基础设施迁移仍需独立 Release / DevOps Sprint。

### 验证与阻塞

| 项目 | 结果 |
|---|---:|
| `docker compose --env-file .env.example config` | 通过 |
| 前端 `npm run build` | 通过 |
| 后端 `npm run build` | 通过 |
| Docker CLI / Compose | 已安装 |
| Docker 镜像构建、`docker compose up`、容器健康检查 | 未执行 |

阻塞原因：Docker Desktop daemon 未启动，`docker info` 无法连接 `dockerDesktopLinuxEngine`。

---

## 今日最终状态

### 已完成

- Viewer 协作 API 接线；
- 文件级只读分享创建、接受、撤销闭环；
- 后端测试基线、最小 E2E、路径安全、Cookie、受控预览安全回归；
- 路由级性能拆包；
- Docker Compose、Dockerfile、Nginx 反代、环境模板、部署与备份文档。

### 尚待完成

1. 启动 Docker Desktop 后执行真实容器构建、启动和健康检查。
2. 扩展 Playwright 浏览器 E2E：ZIP 上传/解析、Viewer iframe、Inspector、标注评论、分享访问与撤销。
3. 对 Ant Design 共享包执行组件级按需加载 / Bundle Analyzer 专项优化。
4. 后续 Release / DevOps Sprint：PostgreSQL、Redis、MinIO 应用适配、迁移与升级策略、CI/CD、GitHub 发布规范。

## 八、Viewer 评论模式回归修复（23:00–23:30）

### 问题

在原型 Viewer 的“评论模式”中点击 iframe 预览内容，无法新增草稿标记，右侧评论输入框不会切换到创建标注状态。

### 根因

原实现依赖 overlay 的 `click` 事件。真实 Axure 原型 iframe 注入的交互拦截脚本会在捕获阶段处理点击，导致外层评论层在部分场景下无法稳定收到预期的 `click`。此外，旧坐标以外层 frame shell 计算，还需要手工扣除工具栏高度，容易受外层留白与缩放影响。

### 修复

修改：

```text
frontend/src/pages/projects/PrototypeViewerPage.tsx
frontend/src/styles/shell.css
```

- 评论落点改为 overlay 的 `onPointerDown`，在 iframe 内部点击链路前获取坐标；
- 坐标改为基于 overlay 自身 `getBoundingClientRect()` 计算，自动覆盖工具栏、边框与缩放差异；
- 评论模式 overlay 增加 `touch-action: none`、`user-select: none`，保证鼠标与触控交互一致，避免选择文本或手势干扰；
- 保持现有 marker 点击选择/回复逻辑不变。

### 浏览器级验证

本地服务在网关重启后重新启动：

```text
API:  http://127.0.0.1:3001/api/health
Web:  http://127.0.0.1:5173
```

使用有完整文件权限的 `chrisj` 账号，在真实 Axure 文件 `HSB2B-小程序-演示版本` 的 Viewer 页面验证：

1. 点击“评论模式”，按钮进入激活状态；
2. 在预览内容区域坐标约 `(700, 500)` 点击；
3. 成功出现草稿 marker；
4. 右侧显示草稿位置 `47%, 36%`；
5. 输入框占位提示切换为“输入对这个位置的评论...”；
6. 按钮切换为“创建标注”。

结论：**评论模式点击内容区新增标记与评论的阻塞问题已修复并通过真实浏览器验证。**

### 当日收工与下一步

- 前端 `npm run build` 已通过。
- 当前前端/API 本地开发服务仍处于启动状态（网关再次重启或主机重启后需重新启动）。
- 明日优先建议：补 Viewer 评论创建/回复的 Playwright E2E，用例应覆盖评论模式 → 点位草稿 → 输入 → 创建 → 刷新后标记/评论仍存在；随后再扩展 iframe Inspector、分享撤销回归。

---

### 延续修复：Viewer 返回与项目工作台文件名（00:42–00:52）

用户反馈两个问题：

1. 原型预览页左上角“返回”无法回到项目工作台；
2. 项目工作台的原型名称显示乱码。

#### 修复内容

- **返回项目**：Viewer 在加载页面目录后立即独立保存 `projectId`；左上角返回优先用已加载的项目详情，失败/刷新期间则回退到该独立 ID，最终无项目上下文时使用浏览器历史回退。避免异步详情状态暂时为空导致点击无动作。
- **新上传文件名**：修正 multipart UTF-8 → Latin-1 修复判断。旧逻辑未覆盖以 `å`、`æ` 等字符开头的典型中文乱码，现改为严格字节 round-trip 判断。
- **历史文件名**：项目文件列表接口对既有数据库记录进行安全的显示层纠正：仅当 Latin-1 重解码可得到有效中文且无替换字符时返回修复后名称；不写回数据库、不影响 ASCII/正常 Latin 文件名。

#### 验证

- 后端 `npm run build`：通过；
- 前端 `npm run build`：通过；
- 重新启动本地 API（3001）与 Vite 服务后，浏览器真实验证：
  - Viewer 左上角“返回项目”已导航到 `/projects/project-1`；
  - 项目工作台显示 `HSB2B-小程序-演示版本` 和 `HSB2B-小程序-演示版本.zip`，无乱码。

---

## 相关记录

- `HyperDesign-Sprint6C-E2E与部署准备_2026-07-21.md`
- `HyperDesign-本地Docker部署指南.md`
- `hyperdesign-阶段1-缺口清单与实施方案_2026-07-22.md`
