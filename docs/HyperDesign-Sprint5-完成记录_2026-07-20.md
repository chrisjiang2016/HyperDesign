# HyperDesign Sprint 5 完成记录

> 完成日期：2026-07-20  
> 状态：Sprint 5 协作评论首轮闭环完成

## 交付范围

本轮完成 Viewer 评论协作的持久化闭环，覆盖：

1. 页面相对坐标标注（`topPercent` / `leftPercent`）；
2. 标注首条评论与一级回复；
3. 标注状态：`OPEN` / `RESOLVED`；
4. 基于既有 `FilePermission.canView / canComment / canEdit` 的访问控制；
5. 评论编辑与删除：评论作者或文件编辑者可编辑、删除自己的评论；标注作者或文件编辑者可删除整个标注及其关联评论。

分享链接未并入本轮：其涉及令牌、过期策略、撤销、匿名访问与预览资源边界，保留为独立安全设计任务。

## 数据模型

新增 Prisma 实体：

```text
Annotation
- fileId / pageId
- number（文件范围内连续编号）
- title
- topPercent / leftPercent
- status：OPEN / RESOLVED
- createdById

AnnotationComment
- annotationId
- parentId（仅允许一级回复）
- content
- createdById
```

约束：

- `Annotation` 在同一文件内的 `number` 唯一；
- 页面、文件删除时级联清理协作数据；
- 仅有 `canComment` 的用户可创建标注或评论；
- 仅标注作者或文件编辑者可切换已解决状态；
- 读取协作数据始终先通过现有文件查看权限校验。

## 新增 API

```text
GET   /api/files/:fileId/annotations?pageId=:pageId
POST  /api/files/:fileId/pages/:pageId/annotations
POST  /api/files/:fileId/annotations/:annotationId/comments
PATCH /api/files/:fileId/annotations/:annotationId/status
PATCH /api/files/:fileId/annotations/:annotationId/comments/:commentId
DELETE /api/files/:fileId/annotations/:annotationId/comments/:commentId
DELETE /api/files/:fileId/annotations/:annotationId
```

## Viewer 改造

- 右侧评论面板和画布 Marker 改为请求真实标注数据；
- 创建标注后立即写入数据库并更新画布；
- 选择 Marker 后可发表回复，刷新页面仍保留；
- 支持在评论项中标记解决/重新打开；
- 无评论权限时禁用评论模式的写入入口；
- 项目详情的待处理反馈数改为统计真实 `OPEN` 标注。

## 验证

```text
Prisma validate              PASS
Prisma generate / db push    PASS
Backend npm run build        PASS
Frontend npm run build       PASS
Frontend npm run lint        PASS（0 error，5 个既有 warning）
```

真实 API 冒烟验证：

```text
健康检查                      PASS
登录                          PASS
受控文件 / 页面读取            PASS
创建带相对坐标的标注            PASS
创建一级回复                   PASS
切换为 resolved                PASS
按页面读取标注                 PASS
```

## 后续建议

Sprint 5 已完成，不再继续增加评论导出或评论筛选能力。

下一阶段建议进入 Sprint 6：分享链接安全模型、E2E、CI、部署与 UAT。
