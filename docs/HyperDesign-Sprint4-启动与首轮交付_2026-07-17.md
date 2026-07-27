# HyperDesign Sprint 4 启动与首轮交付

> 日期：2026-07-17
> 状态：进行中（首个可运行闭环已完成）

## 本轮已完成

### 文件级权限数据模型

新增 `FilePermission`：

- `fileId` / `userId` 唯一约束；
- `canView`、`canComment`、`canEdit`、`canDelete` 四类独立能力；
- `grantedById` 审计授权来源；
- 关联 `User` 与 `PrototypeFile`。

上传新的 ZIP 时，上传者自动获得该文件完整权限。

### 文件级访问边界

已将以下访问链路收敛到文件级权限判定：

- 文件页面目录：`GET /api/files/:fileId/pages`
- 受控预览资源：`GET /api/preview/files/:fileId/resource?path=...`
- 项目内文件列表：`GET /api/projects/:projectId/files`

过渡策略：旧文件保留上传者可见，避免已有开发数据在迁移后不可访问；其他团队成员需要明确 `canView` 授权。

### 新增 API

```text
GET /api/projects/:projectId/first-preview
GET /api/files/:fileId/permissions/me
PUT /api/projects/:projectId/files/:fileId/permissions/:userId
```

`first-preview` 返回用户在目标项目中可预览的首个已解析原型及其入口页，供 Viewer 项目切换使用。

### 受控预览响应安全

预览资源增加：

```text
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
Content-Security-Policy: sandbox allow-scripts allow-same-origin
```

同时保留原有登录校验、文件权限校验、路径规范化、防路径穿越与 MIME 类型输出。

### Viewer 去 mock 首轮

- 页面目录、项目、文件、当前文件权限均使用真实 API；
- 项目切换不再依赖 mock 的“首文件/首页”映射，改为调用 `first-preview`；
- 预览 iframe 统一使用 `/api/preview/...` 受控资源地址；
- 评论和标注持久化仍属于 Sprint 5，当前本地演示交互保留。

## 验证

```text
npx prisma validate  ✅
npx prisma generate ✅
npx prisma db push  ✅
backend npm run build ✅
frontend npm run build ✅
```

接口冒烟：

```text
登录                                 201
获取团队项目导航                     200
GET /projects/project-1/first-preview 200
GET /files/not-real/permissions/me   404
```

`first-preview` 已返回真实文件 ID、入口页 ID 与 `index.html` 路径。

## 下一步

1. 在项目详情页增加文件权限管理入口和成员授权列表；
2. 增加多用户文件可见/不可见及预览资源拒绝的自动化测试；
3. 使用真实 Axure ZIP 在浏览器执行 iframe 跳转、动态面板与 Inspector 回归；
4. 为 Sprint 5 接入评论、回复与相对坐标锚点持久化。
