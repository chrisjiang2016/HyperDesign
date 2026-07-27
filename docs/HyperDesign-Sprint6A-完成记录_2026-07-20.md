# HyperDesign Sprint 6A 完成记录：file_only 安全分享

> 完成日期：2026-07-20  
> 状态：完成

## 范围

本次实现 Sprint 6A 的 `file_only` 安全分享闭环。`team_invite` 未纳入本次范围，避免在未完成独立权限设计前扩大团队成员与项目权限边界。

## 功能交付

### 分享链接管理

- 文件上传者或拥有该文件 `canEdit` 权限的用户可创建分享链接；
- 有效期可设置为 1–30 天，前端默认 7 天；
- 可查看指定文件的分享链接状态、到期时间、接受次数；
- 可主动撤销有效链接，撤销即时生效；
- 新链接只在创建响应中返回一次原始 token，列表 API 永不返回 token。

### 外部访问与接受

```text
/share/:token
→ 校验 token、有效期与撤销状态
→ 未登录时跳转登录，并在登录后回到原分享页
→ 接受后获得该文件的临时、最小化只读访问
→ 跳转至受控 Viewer
```

`file_only` 的授权规则：

- 不加入团队；
- 不创建项目权限；
- 不写入永久 `FilePermission`；
- 仅在分享链接仍为 `ACTIVE` 且未到期时，通过 `ShareGrant` 判定该用户可查看目标文件；
- 不授予评论、编辑、删除权限；
- 链接撤销或过期后，已接受用户立即失去由该链接带来的访问能力。

## 数据与安全设计

新增模型：

```text
ShareLink
- fileId
- tokenHash（SHA-256）
- status：ACTIVE / REVOKED
- expiresAt
- createdById
- revokedAt

ShareGrant
- shareLinkId
- userId
- acceptedAt
```

- 原始 token 使用 `randomBytes(32).toString('base64url')` 生成；
- 数据库只保存 SHA-256 token hash；
- 分享接受与授权写入使用事务；
- 创建、接受、撤销操作均记录至 `operation_logs`；
- 文件访问层会复查关联链接是否仍有效，不依赖前端隐藏入口。

## API

```text
GET    /api/files/:fileId/shares
POST   /api/files/:fileId/shares
DELETE /api/files/:fileId/shares/:shareId

GET    /api/shares/:token
POST   /api/shares/:token/accept
```

## 前端接入

- 项目文件行新增「🔗 分享文件」入口；
- 分享管理弹窗支持创建、展示一次性链接、查看状态、撤销；
- 新增 `/share/:token` 分享访问页；
- 未登录用户登录后会回到对应的分享页；
- 接受成功后自动打开真实受控 Viewer。

## 验证

```text
Prisma validate / generate / db push    PASS
backend npm run build                   PASS
frontend npm run build                  PASS
frontend npm run lint                   PASS（0 error，5 个既有 warning）
```

真实 API 冒烟已验证：

```text
创建分享链接                 PASS
匿名检查有效链接             PASS
第二用户登录后接受链接        PASS
第二用户读取目标文件页面目录   PASS
撤销链接                     PASS
撤销后再访问链接被拒绝        PASS
```
