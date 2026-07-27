# HyperDesign 开发进度记录

> 更新日期：2026-07-17 00:30 GMT+8  
> 当前状态：Sprint 0～Sprint 3 已完成；下一步进入 Sprint 4。

---

## 1. 本次记录范围

本记录补充 2026-07-16 至 2026-07-17 的实际研发结果，并以当前代码、构建和 API 验证结果为准。

项目位置：

```text
C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype
```

> 说明：当前目录尚未初始化 Git 仓库，因此本次以文件、构建与接口验证作为交付依据。

---

## 2. Sprint 状态总览

| Sprint | 目标 | 状态 | 验证 |
|---|---|---:|---|
| Sprint 0 | 工程初始化、ZIP / Axure / Preview Spike | ✅ 完成 | 真实 Axure ZIP 已验证 |
| Sprint 1 | 注册、登录、会话与前端 Auth 联调 | ✅ 完成 | 前后端 Auth 链路可用 |
| Sprint 2 | 团队、成员、项目、项目权限及真实页面接入 | ✅ 完成 | 构建与项目 ZIP 接口链路通过 |
| Sprint 3 | 文件夹、异步 ZIP 解析、页面目录与失败恢复 | ✅ 完成 | 真实 Axure ZIP 异步解析及重试通过 |
| Sprint 4 | 文件级权限、预览资源、Viewer 去除剩余 mock | ⏭️ 待开始 | - |
| Sprint 5 | 评论、标注、反馈状态持久化 | ⏳ 未开始 | - |

---

## 3. Sprint 2 已完成内容

### 3.1 后端业务主干

- 团队：列表、创建、更新、删除。
- 团队成员：查询、添加、移除、上传权限控制。
- 项目：列表、创建、详情、更新、删除。
- 权限：
  - 团队管理员权限；
  - 项目 `view / edit` 权限；
  - 团队成员上传权限；
  - 最后一位团队管理员不可被移除。
- 项目文件：
  - `PrototypeFile.projectId` 关联项目；
  - 项目内 ZIP 上传、页面解析、文件列表；
  - 项目成员的受控页面目录与预览资源访问。

### 3.2 前端真实数据接入

已从 mock 迁移至 API 的区域：

- 工作台 `TeamsPage`；
- 左侧团队 / 项目导航 `NavTree`；
- 团队详情 `TeamDetailPage`；
- 项目详情 `ProjectDetailPage`；
- Viewer 的真实文件页面目录、项目归属与受控资源 URL。

---

## 4. Sprint 3 已完成内容

### 4.1 项目文件夹与目录

新增 `ProjectFolder` 数据模型：

- 支持多级目录（`parentId`）；
- 项目内同级目录名称唯一；
- 支持目录创建、读取、更新、删除；
- 禁止将目录移动至自身或子目录，防止循环；
- 删除目录时，目录内原型文件退回项目根目录，不丢失文件。

新增 / 完善接口：

```text
GET    /api/projects/:projectId/folders
POST   /api/projects/:projectId/folders
PUT    /api/projects/:projectId/folders/:folderId
DELETE /api/projects/:projectId/folders/:folderId
PATCH  /api/projects/:projectId/files/:fileId/folder
```

`PrototypeFile` 已增加 `folderId`，项目文件可归属根目录或任意文件夹。

### 4.2 ZIP 上传与异步解析

- 项目 ZIP 上传接口支持 `folderId`：可直接上传到指定目录。
- 上传请求返回后立即进入 `parsing`，不再等待解析完成。
- 本地开发版使用 `setImmediate` 执行后台解析；未来可由 BullMQ/Redis Worker 替代，不改变 API 契约。
- 解析完成后写入：
  - `SUCCESS / FAILED`；
  - 页面数量；
  - 入口页；
  - 页面目录；
  - `parseError` 失败原因。

### 4.3 解析状态与恢复

项目详情页已支持：

- 检测到 `parsing` 文件时，每 2 秒自动刷新项目、文件和目录数据；
- 成功后停止轮询，刷新页面数与预览入口；
- `failed` 文件展示具体解析错误；
- 编辑者可在失败文件旁触发“重新解析”。

新增接口：

```text
POST /api/projects/:projectId/files/:fileId/retry-parse
```

重试行为：清理旧页面记录 → 重置解析状态 → 清理旧解压目录 → 后台重新解析。

---

## 5. 本次验证结果

### 5.1 构建

```text
backend:  npm run build  ✅
frontend: npm run build  ✅
```

前端构建期间发现并处理了 Windows 下仅大小写不同的页面文件名冲突，统一为：

```text
src/pages/projects/ProjectDetailPage.tsx
src/pages/teams/TeamDetailPage.tsx
```

### 5.2 真实 Axure ZIP 异步端到端验证

测试文件：

```text
C:\Users\Chris J\Documents\产品文档\HSB2B-小程序-演示版本.zip
```

验证链路：

```text
登录
→ 项目文件上传
→ 初始状态 parsing
→ 后台解析
→ 状态 success
→ 获取页面目录
→ 重新解析
→ 再次 success
```

验证结果：

| 项目 | 结果 |
|---|---:|
| 上传初始状态 | `parsing` |
| 状态变化 | `parsing → success` |
| Axure 页面数 | 6 |
| 页面目录接口返回 | 6 条 |
| 重新解析状态变化 | `parsing → success` |
| 重试后页面数 | 6 |

### 5.3 文件夹接口验证

已验证：

```text
创建临时文件夹       ✅
读取真实目录树       ✅
删除临时文件夹       ✅
删除后根目录文件保留 ✅
```

---

## 6. 当前架构说明与风险

### 已具备

- NestJS API + Prisma 数据层；
- 本地 SQLite 开发数据库；
- HttpOnly Cookie 会话；
- 项目级权限与团队上传权限；
- ZIP 安全校验、解压、页面扫描、受控资源预览；
- 文件夹和异步解析恢复机制。

### 后续正式化事项

- 当前异步解析是本地 `setImmediate` 实现，仅适合开发环境。
- 正式部署阶段应切换为 PostgreSQL、Redis/BullMQ、对象存储（MinIO/S3）。
- 当前项目尚无 Git 仓库；发布前需初始化 Git、补充 `.gitignore`、环境变量模板、Docker Compose、CI/CD 和部署文档。

---

## 7. 下一步：Sprint 4

Sprint 4 目标：文件级权限、受控预览资源与 Viewer 真实化。

建议顺序：

1. 增加 `file_permissions` 数据模型及文件级 `view / comment / edit / delete` 权限；
2. 将文件预览、页面目录、资源访问统一改为文件权限判断；
3. 清理 Viewer 中残留的 mock 项目切换和页面辅助数据；
4. 用真实 Axure 包在浏览器中验证 iframe 页面跳转、动态组件与受控资源不受影响；
5. 为 Sprint 5 的评论 / 标注持久化预留文件、页面与坐标锚点。
