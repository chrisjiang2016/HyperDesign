# HyperDesign Sprint 4 完成记录

> 完成日期：2026-07-17
> 状态：已完成

## 目标与交付

### 1. 文件级权限模型与访问边界

完成 `FilePermission` 数据模型：

- `canView`、`canComment`、`canEdit`、`canDelete`；
- 文件与用户唯一授权关系；
- `grantedById` 保留授权来源；
- 新上传 ZIP 自动授予上传者完整权限。

文件列表、页面目录及受控预览资源均已收敛到文件级权限校验。为兼容已有数据，历史文件保留上传者可见的过渡规则。

### 2. 文件权限管理界面

项目详情页的每个文件资产新增“🔐 文件权限”入口：

- 仅项目编辑者可操作；
- 弹窗展示当前项目团队成员、角色、上传者标记与现有授权；
- 可直接勾选查看、评论、编辑、删除四项能力；
- 若关闭查看，前端同步关闭评论、编辑、删除；
- 上传者权限固定为完整权限，避免误将文件所有者锁出。

新增接口：

```text
GET /api/projects/:projectId/files/:fileId/permissions
GET /api/files/:fileId/permissions/me
PUT /api/projects/:projectId/files/:fileId/permissions/:userId
GET /api/projects/:projectId/first-preview
```

### 3. Viewer / 导航真实化

- Viewer 项目、文件、页面目录、当前权限均由 API 驱动；
- 项目切换请求 `first-preview`，不再依赖 mock 首文件/首页映射；
- 预览 iframe 只访问 `/api/preview/...` 的受控资源；
- 左侧常用导航去除 `project-1`、`file-1`、`team-1` 的硬编码演示链接，改为当前用户实际可访问的第一个项目/原型/团队。

评论、回复、坐标锚点持久化明确保留在 Sprint 5，不是本 Sprint 遗留。

## 验证结果

```text
Prisma schema validate       PASS
Prisma generate / db push    PASS
backend npm run build        PASS
frontend npm run build       PASS
frontend npm run lint        PASS（0 error，6 个既有 warning）
```

接口权限回归（真实运行 API）：

```text
权限成员列表                    200（返回 2 位团队成员）
已授权用户页面目录              200
未登录预览资源直链              401
有项目权限但无文件查看权限      400（拒绝）
授予 canView 后页面目录          200
授予 canView 后受控预览资源      200
预览响应 Cache-Control           private, no-store
预览响应 CSP                     已返回
```

## 已知非阻塞项

- 后端当前没有测试文件，`npm run test` 会因 Jest 未发现测试而以 code 1 退出；本轮已采用真实 API 冒烟覆盖核心权限路径。建议 Release Sprint 补齐 Jest/Supertest 测试套件。
- 前端 lint 的 6 个 warning 为原有 `TeamDetailPage` hook 依赖、Inspector 公共脚本与 Sprint 5 预留的标注 helper；无 lint error。
- 真实浏览器 Playwright 截图无法稳定完成：环境缺少 Playwright bundled Chromium，调用本机 Edge 的首次渲染进程被系统终止。API 级受控预览、真实 Axure ZIP 上传/解析/入口页链路均已验证。浏览器 E2E 建议在 Release/CI 环境安装固定浏览器后纳入自动化。

## 下一个 Sprint

Sprint 5：评论、回复、页面锚点及相对坐标持久化；并将 Viewer 当前本地标注交互接入真实协作数据。
