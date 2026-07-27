# HyperDesign V1 实际前后端研发计划

> 版本：v1.0  
> 日期：2026-07-15  
> 状态：待研发启动  
> 计划基线：现有 React 前端、PRD v1.0.2、架构与数据库设计 v1.0、API 设计 v1.0、Viewer 已实现的真实 HTML iframe / 实时标注交互  
> 目标：将当前可演示的前端原型升级为可登录、可授权、可上传、可协作、可部署的 V1 产品。

---

## 1. 当前基线与目标边界

### 1.1 已有资产（直接复用）

| 资产 | 状态 | 研发处理方式 |
|---|---|---|
| React + TypeScript + Vite 前端 | 已具备 | 保留工程与页面结构，逐步用真实 API 替换 mock |
| Auth / 团队 / 项目 / 设置页面 | 已完成 UI | 接入 API、表单校验、加载/错误/空状态 |
| Prototype Viewer | 已完成可演示交互 | 改为读取后端受控预览资源与持久化评论 |
| iframe Inspector | 已实现 | 保留前端实现；确保后端预览资源同源、可注入脚本 |
| PRD、架构、API 文档 | 已完成 | 作为实现与验收基线 |
| `mockData` / `viewerMockData` | 已存在 | 只作为开发期 fallback；按模块完成后删除对应 mock 依赖 |

### 1.2 V1 交付闭环

```text
注册 / 登录
→ 团队与成员
→ 项目 / 文件夹
→ ZIP 上传
→ 安全解压与 HTML 页面识别
→ 受控 iframe 预览
→ 项目与文件权限校验
→ 实时标注查看
→ 评论 / 回复持久化
→ 分享链接访问
→ 测试、安全检查、部署
```

### 1.3 不纳入本轮实际研发

- 原型版本管理、上传历史、版本对比
- 批量权限配置
- 评论解决状态、通知中心
- SSO / OAuth
- 标注文档导出
- 多人实时协同编辑
- 管理后台的完整审计日志查询界面

---

## 2. 研发原则与关键决策

### 2.1 推荐技术选型

| 层级 | 选型 | 理由 |
|---|---|---|
| 前端 | 现有 React 19 + TypeScript + Vite + Ant Design + React Query + Zustand | 保留现有投入；React Query 接管服务端状态 |
| 后端 | NestJS + TypeScript + REST | 模块边界、参数校验、Guard、测试与 Swagger 支持较好 |
| ORM | Prisma | 数据迁移、类型安全、事务与测试效率适合 V1 |
| 数据库 | PostgreSQL 16 | 关系、索引、事务与后续权限查询更稳妥 |
| 会话 | HttpOnly Session Cookie；Redis 存 Session | 前端不存 Token，符合既有 API 文档推荐 |
| 任务队列 | Redis + BullMQ | ZIP 解压、扫描、页面目录生成异步化，避免 API 请求超时 |
| 存储 | 开发环境本地磁盘；生产环境 MinIO / S3 兼容对象存储 | 保留统一 Storage Adapter，部署时可切换 |
| 原型资源 | 后端受控资源路由 + iframe sandbox | 防路径穿越并执行文件级权限校验 |
| 测试 | Vitest / React Testing Library；Jest 或 Vitest + Supertest；Playwright | 分层覆盖接口、权限、上传预览与关键 E2E |
| 部署 | Docker Compose（frontend / api / worker / PostgreSQL / Redis / MinIO / Nginx） | 便于私有化部署与测试环境复现 |

> 推荐以 NestJS 的 Express Adapter 启动，优先保证 multipart、session、静态/流式资源返回的开发稳定性；性能优化不作为 V1 前置条件。

### 2.2 必须先冻结的权限模型

用户最新确认的规则：**Viewer 的项目切换器仅显示当前用户在当前团队内、有查看或编辑权限的项目。**

因此正式后端不能只保留旧设计中的 `file_permissions`；需补充项目级权限：

```text
team_members：用户是否属于团队、是否可上传
project_permissions：用户是否可查看/编辑项目（决定项目列表和 ProjectSwitcher）
file_permissions：用户对具体原型文件的查看/评论/编辑/删除能力（不继承）
```

建议新增表：

```sql
project_permissions (
  id,
  project_id,
  user_id,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  granted_by,
  created_at,
  updated_at,
  unique(project_id, user_id)
)
```

#### 权限判定

| 场景 | 判定 |
|---|---|
| 项目列表 / Viewer ProjectSwitcher | 当前用户是管理员，或存在 `project_permissions.can_view / can_edit` |
| 项目编辑 | 管理员，或 `project_permissions.can_edit` |
| 文件列表 | 已有项目可见权限 + 对文件具备 `file_permissions.can_view`；管理员可管理范围内全部 |
| 文件预览资源 | `file_permissions.can_view` 或管理员权限 |
| 评论 | `file_permissions.can_comment` |
| 上传文件 | 团队 `can_upload` + 项目 `can_edit`（管理员绕过） |

> **不继承原则保留：** 项目可见不自动等于文件可见；项目权限用于发现与进入项目，文件权限用于访问原型文件与预览资源。

### 2.3 ID 与 API 规范

- 内部数据库使用 UUID（推荐）或 bigint；前端不依赖 ID 类型。
- API 基础路径保持 `/api`。
- 返回格式沿用已有文档：`{ success, data, message }`。
- 所有列表统一支持 `page/pageSize`，项目/页面目录可支持 keyword。
- 所有写操作写入 `operation_logs`（登录、上传、解析失败、权限/分享变更、删除）。
- 所有鉴权必须后端执行；前端隐藏入口不能作为权限保护。

---

## 3. 服务结构与目录建议

```text
HTML prototype/
├── frontend/                 # 既有 React 工程
├── backend/
│   ├── src/
│   │   ├── common/           # 响应体、错误码、Guard、日志、DTO
│   │   ├── config/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── teams/
│   │   ├── projects/
│   │   ├── folders/
│   │   ├── prototype-files/
│   │   ├── uploads/
│   │   ├── preview/
│   │   ├── permissions/
│   │   ├── shares/
│   │   ├── comments/
│   │   ├── jobs/
│   │   └── health/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── test/
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── env.example
└── docs/
```

### 3.1 环境配置（不提交真实密钥）

```dotenv
DATABASE_URL=
REDIS_URL=
SESSION_SECRET=
STORAGE_DRIVER=local|minio
STORAGE_LOCAL_ROOT=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
MAX_UPLOAD_BYTES=104857600
APP_ORIGIN=
API_ORIGIN=
```

---

## 4. 分期、任务与验收

按 **6 个研发 Sprint + 发布准备** 组织。单 Sprint 以 1 周为参考；可并行时前后端同步推进。

## Sprint 0：工程初始化与高风险 Spike（3–5 天）

### 目标

先证明 ZIP / Axure / 同源预览 / Inspector 在真实后端资源链路下可行，再批量开发业务模块。

### 后端任务

| ID | 任务 | 验收 |
|---|---|---|
| S0-BE-01 | 初始化 NestJS、Prisma、PostgreSQL、Redis、Docker Compose | `api`、`db`、`redis` 可一键启动 |
| S0-BE-02 | 建立配置模块、健康检查、统一错误响应、请求日志 | `/api/health` 返回依赖状态 |
| S0-BE-03 | 建立本地 Storage Adapter 和临时上传目录 | 不可通过相对路径逃逸目录 |
| S0-BE-04 | Spike：ZIP 安全解压 + HTML 递归扫描 | 可识别多层 `.html/.htm`；拦截 Zip Slip |
| S0-BE-05 | Spike：受控预览资源路由 | HTML/CSS/JS/图片相对资源均可加载 |
| S0-BE-06 | Spike：复杂 Axure 样例 | 至少 1 个动态面板 + 1 个多级页面树样例可运行 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S0-FE-01 | 抽象 Axios API Client、错误处理、React Query Provider | 可切换 mock/API 基地址 |
| S0-FE-02 | 建立 API 错误态、加载态基础组件 | 401/403/422/500 有统一反馈 |
| S0-FE-03 | Viewer 用真实 API 资源 URL 进行受控 iframe 验证 | Inspector script 注入与 postMessage 可用 |

### 出口条件（未通过则暂停后续上传模块）

- Axure 资源、页面树、动态面板没有被资源路由破坏。
- iframe 与平台保持同源策略可用，Inspector 能读取元素 computed style。
- 安全解压防 Zip Slip 已有自动化测试。

---

## Sprint 1：身份、会话、角色与基础权限（1 周）

### 后端任务

| ID | 任务 | 验收 |
|---|---|---|
| S1-BE-01 | Prisma schema：users、sessions、operation_logs | migration + seed 可重复执行 |
| S1-BE-02 | 注册、登录、登出、`/auth/me` | HttpOnly Cookie；密码 bcrypt/argon2 哈希 |
| S1-BE-03 | 重置密码、修改密码 | 不泄露用户不存在信息；临时密码策略可审计 |
| S1-BE-04 | Session Guard、Role Guard、全局错误码 | 未登录 401、无权 403、一致响应 |
| S1-BE-05 | 初始管理员 seed 与开发账户 | 开发环境可一键初始化 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S1-FE-01 | Auth 页面替换 mock 为真实 API | 登录成功后恢复会话并跳首页 |
| S1-FE-02 | 路由守卫 / 会话恢复 | 刷新后能根据 `/auth/me` 恢复用户 |
| S1-FE-03 | 个人设置接修改密码 | 错误文案与表单校验对齐 API |
| S1-FE-04 | Topbar 用户名、退出登录接真实会话 | 登出后清缓存并跳登录 |

### Alpha-A 验收

- 注册、登录、登出、改密、会话恢复可用。
- 业务页面无法由未登录用户直接访问。
- 密码、Session Secret、Cookie 均不出现在浏览器存储或日志中。

---

## Sprint 2：团队、项目、成员与项目权限（1 周）

### 后端任务

| ID | 任务 | 验收 |
|---|---|---|
| S2-BE-01 | teams、team_members、projects、project_permissions schema/migration | 唯一约束和索引完整 |
| S2-BE-02 | 团队 CRUD、我的团队列表 | 仅管理员/子管理员可创建团队 |
| S2-BE-03 | 成员添加/移除、`can_upload` 管理 | 非团队管理员不能操作成员 |
| S2-BE-04 | 项目 CRUD | 项目归属团队、删除事务处理 |
| S2-BE-05 | 项目权限设置与“我可查看项目列表”接口 | ProjectSwitcher 用此接口；无权项目不返回 |
| S2-BE-06 | 审计日志：团队/项目/权限写操作 | 记录操作者、对象和动作 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S2-FE-01 | 团队首页、团队详情切真实 Query | mock 不再作为主数据源 |
| S2-FE-02 | 新建/编辑团队、成员管理接 Mutation | 权限不足时不显示/不可提交 |
| S2-FE-03 | 项目创建、编辑、删除接 API | 成功后精确失效 React Query 缓存 |
| S2-FE-04 | Viewer ProjectSwitcher 接“当前用户可访问项目”接口 | 只展示当前团队下 `view/edit` 项目 |

### Alpha-B 验收

- 一个用户能看见其团队内、被明确授予查看/编辑权限的项目。
- 无项目权限的项目不会出现在列表或 ProjectSwitcher。
- 直接访问无权限项目 API 返回 403/404（按最终安全策略统一）。

---

## Sprint 3：文件夹、ZIP 上传、解析与页面目录（1.5 周）

### 后端任务

| ID | 任务 | 验收 |
|---|---|---|
| S3-BE-01 | folders schema + 多级 CRUD | 同项目内 parent_id 合法；循环引用拒绝 |
| S3-BE-02 | prototype_files / prototype_pages schema | 解析状态、入口页、页面顺序可记录 |
| S3-BE-03 | 上传接口：multipart、ZIP 校验、100MB 限制 | 非 ZIP / 超限 / 无上传权限正确拒绝 |
| S3-BE-04 | BullMQ 解析任务：保存 ZIP、安全解压、扫描 HTML、提取 title、入口识别 | API 不长时间阻塞；状态可查询 |
| S3-BE-05 | 失败清理、重试策略、解析日志 | 失败有错误原因；临时目录清理 |
| S3-BE-06 | 页面目录接口、文件详情接口 | 页面按目录/排序返回 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S3-FE-01 | 项目详情文件夹树、文件列表接 API | 文件状态、页数真实显示 |
| S3-FE-02 | 上传 ZIP 弹窗接真实 multipart | 显示上传中 / 解析中 / 成功 / 失败 |
| S3-FE-03 | 解析状态轮询或 SSE（V1 可轮询） | 结束后自动刷新页面目录 |
| S3-FE-04 | 文件详情页 / Viewer 左栏页面目录接真实 pages | 不依赖 viewerMockData |

### Alpha-C 验收

- 用户上传合法 ZIP 后，解析任务可完成，能在项目内看到文件与页面目录。
- 恶意 `../` ZIP 路径、非 ZIP、超 100MB、没有 HTML 的 ZIP 均被安全处理。
- Axure 基准样例页面目录可识别。

---

## Sprint 4：受控预览资源、文件权限与 Viewer 真实数据（1 周）

### 后端任务

| ID | 任务 | 验收 |
|---|---|---|
| S4-BE-01 | file_permissions schema 与 CRUD | view/comment/edit/delete 独立配置 |
| S4-BE-02 | 文件列表按权限过滤 | 普通用户只获取 `can_view` 文件 |
| S4-BE-03 | 预览资源路由 `/api/preview/files/:id/resource?path=` | 每次请求鉴权 + path 安全校验 + 正确 MIME |
| S4-BE-04 | 预览文件/页面元数据 API | 返回入口页、目录树、当前用户权限 |
| S4-BE-05 | ProjectSwitcher “首个可预览文件”查询 API | 返回当前用户能预览的首个文件和第一页 |
| S4-BE-06 | 资源缓存头与安全头 | 不缓存敏感 HTML；iframe sandbox 策略验证 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S4-FE-01 | Viewer 接真实 file/page/permission Query | 移除项目首文件/权限相关 mock |
| S4-FE-02 | 项目切换：项目 → 首个可预览文件 → 第 1 页 | 无可预览文件显示空状态，不跳错误页 |
| S4-FE-03 | iframe 资源 URL 迁移到 API 受控路由 | HTML 的相对 CSS/JS/图片完整加载 |
| S4-FE-04 | Viewer 按 `can_view/can_comment/can_edit` 控制操作入口 | 后端仍为最终裁决 |
| S4-FE-05 | 真实空状态：无项目权限、无文件、解析失败、无页面 | 复用原型视觉，不添加多余功能 |

### Beta-Preview 验收

- 文件与静态资源不能被无权限用户通过直链读取。
- 有权限用户可预览 ZIP / Axure 包页面，且 Inspector 可工作。
- ProjectSwitcher 只显示可访问项目，点击后进入目标项目首个可预览原型的第一页。

---

## Sprint 5：评论、回复、分享链接（1 周）

### 后端任务

| ID | 任务 | 验收 |
|---|---|---|
| S5-BE-01 | comments、comment_replies schema / API | 坐标以相对比例存储 |
| S5-BE-02 | 评论/回复权限校验与内容安全处理 | 仅 `can_comment` 可写；输出转义/净化 |
| S5-BE-03 | 分享链接创建、查询、接受、撤销 | token 安全随机；有效期、撤销生效 |
| S5-BE-04 | `team_invite` / `file_only` 授权事务 | 只写明确授权，不错误扩大权限 |
| S5-BE-05 | 分享访问审计日志 | 记录创建、接受、撤销 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S5-FE-01 | Viewer 评论列表 / 新建 / 回复接真实 API | 写后刷新或乐观更新；刷新不丢失 |
| S5-FE-02 | 评论模式与实时标注模式权限/状态互斥 | 不允许时显示原因 |
| S5-FE-03 | 分享弹窗、分享链接访问页、撤销入口 | 有效期、权限、类型均按 API 回显 |
| S5-FE-04 | 外部访问登录后回跳 | 回到原分享目标，不丢 token |

### Beta-Collaboration 验收

- 两个不同用户可在同一原型页面评论、回复，刷新后数据保留。
- 无 `can_comment` 用户不能写评论/回复。
- file_only 不加入团队；team_invite 按规则加入团队。
- 过期或撤销的链接无法访问资源。

---

## Sprint 6：测试、安全、观测与发布准备（1–1.5 周）

### 后端与运维任务

| ID | 任务 | 验收 |
|---|---|---|
| S6-01 | 单元/集成测试：Auth、Permission、Upload、Preview、Share、Comment | 核心覆盖率目标 ≥ 70%，权限模块 ≥ 85% |
| S6-02 | E2E：登录→团队→项目→上传→预览→评论→分享 | Playwright 在 CI 可跑通 |
| S6-03 | 安全测试：Zip Slip、路径遍历、未授权资源、XSS、会话固定 | 无 P0/P1 安全缺陷 |
| S6-04 | Docker Compose、Nginx、健康检查、备份说明 | 新环境可部署、可恢复 |
| S6-05 | 日志、错误追踪、容量与清理策略 | 可定位上传/解析/预览失败 |
| S6-06 | UAT 缺陷收敛与发布清单 | P0/P1 清零、P2 有记录 |

### 前端任务

| ID | 任务 | 验收 |
|---|---|---|
| S6-FE-01 | 响应式、空态、loading、异常态收口 | 主流程无阻塞 UI |
| S6-FE-02 | Viewer 回归：桌面/平板/移动、缩放、实时标注 | 关键元素规格准确，无交互阻塞 |
| S6-FE-03 | 性能与 bundle 检查 | 首屏与 Viewer 资源按需加载；保留 chunk 优化任务 |

---

## 5. 接口落地顺序

现有 API 设计约 38 个接口，可按依赖分批实现，而非一次性铺开：

| 批次 | 接口域 | 目的 |
|---|---|---|
| A | Auth：register/login/logout/me/reset/change-password | 建会话与前端接入基础 |
| B | Teams / Members / Projects / Project Permissions | 解决团队、项目列表、ProjectSwitcher 权限 |
| C | Folders / Files / Upload / Pages | 打通上传解析与页面目录 |
| D | Preview Resource / File Permissions | 受控预览与文件权限 |
| E | Comments / Replies | 评审协作闭环 |
| F | Share Links | 外部访问闭环 |

### 必须新增或调整的 API

原 API 文档需在研发启动时增补：

```http
GET  /api/projects/accessible?teamId={teamId}
PUT  /api/projects/:projectId/permissions/:userId
DELETE /api/projects/:projectId/permissions/:userId
GET  /api/projects/:projectId/first-preview
```

其中：

```http
GET /api/projects/:projectId/first-preview
```

建议响应：

```json
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "entryPageId": "uuid",
    "entryRelativePath": "index.html"
  },
  "message": "ok"
}
```

---

## 6. 前后端联调策略

### 6.1 迁移方式

不做“某天一次性去 mock”。每完成一个 API 域，替换对应页面的数据源：

```text
Auth API 完成       → Auth 页、Topbar、路由守卫切换
Teams/Projects 完成 → 团队页、项目页、Nav/ProjectSwitcher 切换
Files/Pages 完成    → 项目详情、Viewer 左栏切换
Preview 完成        → iframe URL 切换
Comments 完成       → 评论区切换
```

### 6.2 API Client 约束

- Axios 统一 `withCredentials: true`。
- 统一拦截 401：清理会话状态、跳登录、保留 return URL。
- 统一处理 403：展示无权限，不因前端路由隐藏而假设安全。
- React Query QueryKey 以资源层级组织：`['teams']`、`['projects', teamId]`、`['file', fileId]`、`['comments', fileId, pageId]`。
- Mutation 成功后仅失效相关 cache，禁止全局粗暴 reload。

### 6.3 真实 Viewer 的关键处理

1. iframe 页地址必须来自后端受控资源路径。
2. 注入 Inspector 脚本前确认 HTML 与平台同源；否则需采用同源预览子域方案。
3. 所有资源请求均应带上会话 Cookie，并由后端独立鉴权。
4. 评论坐标存相对比例（0–1 或 0–100），前端根据当前 iframe 尺寸重算。
5. 受控预览资源路由需正确处理 HTML 的相对资源、`Content-Type`、缓存与编码。

---

## 7. 数据迁移、测试与安全清单

### 7.1 数据与环境

- [ ] Prisma migration 可从空库创建完整 schema。
- [ ] Seed 创建超级管理员、测试团队、含不同项目/文件权限的用户。
- [ ] 开发、测试、生产环境变量独立。
- [ ] 不提交 `.env`、Session Secret、数据库密码、S3/MinIO 凭据。
- [ ] 存储文件以 UUID 目录隔离，不采用原始文件名作为路径。

### 7.2 安全最低门槛

- [ ] 密码使用 bcrypt 或 argon2 哈希。
- [ ] Session Cookie：`HttpOnly`、`Secure`（生产）、`SameSite=Lax`。
- [ ] 限流：登录、注册、重置密码、上传、分享接受。
- [ ] ZIP 上传限制 MIME、扩展名与大小；解压时防 Zip Slip。
- [ ] Preview `path` 规范化后必须位于 `extracted/{fileId}` 根目录内。
- [ ] iframe 使用最小必要 sandbox 权限，禁止平台 DOM 直接插入上传 HTML。
- [ ] 评论内容按纯文本输出/净化，禁止脚本执行。
- [ ] 权限检查在路由 Guard / Service 双层执行。
- [ ] 生产日志脱敏 Cookie、密码、token。

### 7.3 核心 E2E 用例

1. 注册 → 登录 → 会话恢复 → 登出。
2. 管理员创建团队 → 添加成员 → 授予项目查看权限。
3. 普通成员仅看到被授权项目；ProjectSwitcher 不显示无权限项目。
4. 成员上传合法 ZIP → 解析成功 → 页面目录可见 → iframe 可预览。
5. 无文件权限用户无法通过资源 URL 直接读取 HTML/CSS/图片。
6. 受控预览中开启实时标注，锁定元素并显示规格。
7. 有评论权限用户新增评论 / 回复；无评论权限用户被拒绝。
8. 创建分享链接 → 外部用户登录接受 → 按 `file_only/team_invite` 得到对应授权。
9. 过期、撤销分享链接无法访问。
10. 恶意 ZIP、路径穿越、XSS 评论均被阻止。

---

## 8. 人力、周期与里程碑

### 推荐配置

| 角色 | 建议投入 | 主要责任 |
|---|---:|---|
| 后端工程师 | 1–2 人 | Auth、权限、文件解析、预览、分享、评论 |
| 前端工程师 | 1 人 | 现有页面 API 接入、Viewer、交互与 E2E |
| 测试 | 0.5–1 人 | Spike 样例、权限矩阵、安全、UAT |
| 产品 | 1 人 | 样例准备、规则确认、验收优先级 |

### 周期预估

| 团队配置 | 预估周期 | 说明 |
|---|---:|---|
| 1 FE + 1 BE + 测试兼职 | 8–10 周 | 串行依赖较多，建议预留 Axure 修复时间 |
| 1 FE + 2 BE + 1 QA | 6–8 周 | 推荐；上传解析和业务 API 可并行 |
| 2 FE + 2 BE + 1 QA | 5–7 周 | 可并行推进 UI 联调与服务端模块 |

### 里程碑

| 里程碑 | 对应 Sprint | 出口 |
|---|---|---|
| M0 Spike 通过 | Sprint 0 | Axure / ZIP / 同源 Inspector 可行 |
| Alpha | Sprint 1–3 | 身份、团队、项目、上传解析和页面目录跑通 |
| Beta | Sprint 4–5 | 受控预览、权限、评论、分享跑通 |
| RC | Sprint 6 | E2E、安全、部署、UAT 通过 |
| V1 发布 | RC 后 | 无 P0/P1 阻塞缺陷 |

---

## 9. 正式开工顺序（建议）

### 第一个开发批次：Sprint 0 + Sprint 1

先做以下内容，不建议直接从业务页面接接口开始：

1. 初始化 NestJS + PostgreSQL + Prisma + Redis/BullMQ + Docker Compose。
2. 完成 Prisma schema、migration、seed 和 `/api/health`。
3. 建真实复杂 Axure ZIP 作为固定回归样例。
4. 验证安全解压与受控预览资源访问。
5. 落地注册、登录、Session、`/auth/me` 与前端 Auth 联调。

### Sprint 0 需要产品/测试提供的输入

- 至少 1 个复杂 Axure 导出 ZIP（动态面板）。
- 至少 1 个多层目录 HTML 原型 ZIP。
- 至少 1 个资源路径复杂、含图片/CSS/JS 的 ZIP。
- 权限矩阵确认：管理员、团队成员、项目 view/edit、文件 view/comment/edit/delete 的可执行规则。
- 外部分享的有效期默认值和最大值。

---

## 10. 当前待确认项

以下不阻塞计划输出，但应在 Sprint 0 结束前确认：

1. **数据库主键：** UUID（推荐）还是 bigint。
2. **存储生产形态：** 初期本地磁盘还是直接 MinIO；推荐开发本地、测试/生产 MinIO。
3. **分享链接默认有效期：** 例如 7 天；最大有效期是否限制。
4. **项目权限授予人：** 仅系统管理员/子管理员，还是项目创建人也可授权。
5. **文件可见规则：** 项目可查看但无文件授权时，项目详情是否展示“无可查看原型文件”的空态（推荐：展示）。
6. **Axure 样例：** 由产品提供并作为每次发布前回归资产。

---

## 11. 启动后的首个可交付物

Sprint 0 结束时应交付：

- `backend/` 可运行工程与 Docker Compose。
- PostgreSQL Schema、Migration、Seed。
- 健康检查和基础 CI。
- ZIP 安全解压与 HTML 扫描 Spike 报告。
- Axure 样例预览验证结论。
- Auth API 初版及前端登录联调分支。

---

## 12. 关联文档

- `HTML原型分享平台_PRD_v1.0.md`
- `HTML原型分享平台_技术架构与数据库设计_v1.0.md`
- `HTML原型分享平台_API接口设计_v1.0.md`
- `HTML原型分享平台_开发任务拆分与排期建议_v1.0.md`
- `docs/HyperDesign-今日进度汇总_2026-07-15.md`
- `docs/HyperDesign-ViewerProjectSwitcher_2026-07-15.md`
