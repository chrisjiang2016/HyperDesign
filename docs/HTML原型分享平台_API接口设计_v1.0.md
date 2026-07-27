# API 接口设计：HTML 原型分享平台 v1.0

> 文档版本：v1.0  
> 创建时间：2026-07-10  
> 关联文档：`HTML原型分享平台_PRD_v1.0.md`、`HTML原型分享平台_技术架构与数据库设计_v1.0.md`  
> 文档用途：前后端联调、接口开发、测试用例编写  
> 当前范围：V1 / MVP

---

## 1. 接口通用规范

### 1.1 Base URL

```text
/api
```

### 1.2 认证方式

V1 推荐使用 Session Cookie。

登录成功后服务端写入 HttpOnly Cookie：

```text
Set-Cookie: sid=xxxx; HttpOnly; SameSite=Lax; Path=/
```

前端请求业务接口时自动携带 Cookie。

### 1.3 通用响应格式

成功：

```json
{
  "success": true,
  "data": {},
  "message": "ok"
}
```

失败：

```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "参数错误"
}
```

### 1.4 通用错误码

| errorCode | 说明 |
|---|---|
| UNAUTHORIZED | 未登录 |
| FORBIDDEN | 无权限 |
| NOT_FOUND | 资源不存在 |
| VALIDATION_ERROR | 参数校验失败 |
| DUPLICATE_USERNAME | 用户名已存在 |
| INVALID_USERNAME_OR_PASSWORD | 用户名或密码错误 |
| FILE_TOO_LARGE | 文件超过 100MB |
| INVALID_FILE_TYPE | 文件类型不支持 |
| ZIP_PARSE_FAILED | ZIP 解析失败 |
| NO_HTML_FOUND | 未识别到 HTML 页面 |
| SHARE_LINK_EXPIRED | 分享链接已过期 |
| SHARE_LINK_REVOKED | 分享链接已撤销 |
| SHARE_LINK_INVALID | 分享链接无效 |

### 1.5 分页格式

请求参数：

```text
?page=1&pageSize=20
```

响应：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 100
}
```

---

## 2. Auth 账号接口

## 2.1 注册

```http
POST /api/auth/register
```

### Request

```json
{
  "username": "chris01",
  "confirmUsername": "chris01",
  "password": "abc123456"
}
```

### 校验规则

| 字段 | 规则 |
|---|---|
| username | 必填；英文字母或数字；长度 5 位以上；不可重复 |
| confirmUsername | 必填；必须与 username 一致 |
| password | 必填；英文字母或数字；长度 6 位以上 |

### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "chris01",
    "role": "employee"
  },
  "message": "注册成功"
}
```

---

## 2.2 登录

```http
POST /api/auth/login
```

### Request

```json
{
  "username": "chris01",
  "password": "abc123456"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "chris01",
    "role": "employee"
  },
  "message": "登录成功"
}
```

---

## 2.3 登出

```http
POST /api/auth/logout
```

### Response

```json
{
  "success": true,
  "data": null,
  "message": "已退出登录"
}
```

---

## 2.4 当前用户

```http
GET /api/auth/me
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "chris01",
    "role": "employee",
    "status": "active"
  },
  "message": "ok"
}
```

---

## 2.5 忘记密码 / 重置密码

```http
POST /api/auth/reset-password
```

### Request

```json
{
  "username": "chris01"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "temporaryPassword": "A8B9C0"
  },
  "message": "密码已重置"
}
```

### 规则

1. 用户名存在时，系统生成临时密码。
2. 临时密码需满足英文字母或数字，长度 6 位以上。
3. 前端用弹窗展示 `temporaryPassword`。

---

## 2.6 修改密码

```http
POST /api/auth/change-password
```

### Request

```json
{
  "oldPassword": "abc123456",
  "newPassword": "new123456",
  "confirmNewPassword": "new123456"
}
```

### Response

```json
{
  "success": true,
  "data": null,
  "message": "密码修改成功"
}
```

---

## 3. User 用户管理接口

## 3.1 用户列表

```http
GET /api/users?page=1&pageSize=20&keyword=chris
```

### 权限

主管理员、子管理员。

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "username": "chris01",
        "role": "employee",
        "status": "active",
        "createdAt": "2026-07-10T08:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1
  },
  "message": "ok"
}
```

---

## 3.2 设置用户角色

```http
PUT /api/users/{userId}/role
```

### 权限

主管理员可设置主管理员、子管理员、员工。  
子管理员不可指定其他管理员，建议仅可将用户设为员工。

### Request

```json
{
  "role": "sub_admin"
}
```

---

## 3.3 删除用户

```http
DELETE /api/users/{userId}
```

### 权限

主管理员、子管理员。

---

## 4. Team 团队接口

## 4.1 我的团队列表

```http
GET /api/teams
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "产品团队",
      "ownerId": 1,
      "memberCount": 12,
      "projectCount": 3,
      "createdAt": "2026-07-10T08:00:00Z"
    }
  ],
  "message": "ok"
}
```

---

## 4.2 创建团队

```http
POST /api/teams
```

### 权限

仅主管理员、子管理员。

### Request

```json
{
  "name": "产品团队"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "产品团队"
  },
  "message": "团队创建成功"
}
```

---

## 4.3 团队详情

```http
GET /api/teams/{teamId}
```

---

## 4.4 修改团队

```http
PUT /api/teams/{teamId}
```

### Request

```json
{
  "name": "产品研发团队"
}
```

---

## 4.5 删除团队

```http
DELETE /api/teams/{teamId}
```

### 规则

V1 无回收站，删除前端必须二次确认。

---

## 5. Team Member 团队成员接口

## 5.1 成员列表

```http
GET /api/teams/{teamId}/members
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "userId": 2,
      "username": "dev01",
      "role": "employee",
      "canUpload": true,
      "joinSource": "manual",
      "joinedAt": "2026-07-10T08:00:00Z"
    }
  ],
  "message": "ok"
}
```

---

## 5.2 按用户名添加成员

```http
POST /api/teams/{teamId}/members
```

### Request

```json
{
  "username": "dev01",
  "canUpload": true
}
```

---

## 5.3 移除成员

```http
DELETE /api/teams/{teamId}/members/{userId}
```

---

## 5.4 设置成员新增文件权限

```http
PUT /api/teams/{teamId}/members/{userId}/upload-permission
```

### Request

```json
{
  "canUpload": true
}
```

---

## 6. Project 项目接口

## 6.1 项目列表

```http
GET /api/teams/{teamId}/projects
```

---

## 6.2 创建项目

```http
POST /api/teams/{teamId}/projects
```

### Request

```json
{
  "name": "移动端原型",
  "description": "App V1 原型"
}
```

---

## 6.3 修改项目

```http
PUT /api/projects/{projectId}
```

---

## 6.4 删除项目

```http
DELETE /api/projects/{projectId}
```

---

## 7. Folder 文件夹接口

## 7.1 文件夹树

```http
GET /api/projects/{projectId}/folders
```

---

## 7.2 创建文件夹

```http
POST /api/projects/{projectId}/folders
```

### Request

```json
{
  "parentId": null,
  "name": "首页流程"
}
```

---

## 7.3 修改文件夹

```http
PUT /api/folders/{folderId}
```

### Request

```json
{
  "name": "登录注册流程"
}
```

---

## 7.4 删除文件夹

```http
DELETE /api/folders/{folderId}
```

---

## 8. Prototype File 原型文件接口

## 8.1 文件列表

```http
GET /api/projects/{projectId}/files?folderId=1
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1001,
      "name": "后台管理原型",
      "parseStatus": "success",
      "pageCount": 28,
      "fileSize": 10485760,
      "uploader": "chris01",
      "createdAt": "2026-07-10T08:00:00Z"
    }
  ],
  "message": "ok"
}
```

---

## 8.2 上传 ZIP 原型包

```http
POST /api/projects/{projectId}/files/upload
Content-Type: multipart/form-data
```

### Form Data

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| file | File | 是 | ZIP 文件，最大 100MB |
| folderId | string | 否 | 所属文件夹 |
| name | string | 否 | 文件显示名称 |

### Response

```json
{
  "success": true,
  "data": {
    "fileId": 1001,
    "parseStatus": "parsing"
  },
  "message": "上传成功，正在解析"
}
```

### 规则

1. 仅支持 `.zip`。
2. ZIP 最大 100MB。
3. 解压后文件总大小不限制。
4. HTML 页面数量不限制。
5. 用户必须具备新增文件权限，或为主管理员 / 子管理员。

---

## 8.3 文件详情

```http
GET /api/files/{fileId}
```

---

## 8.4 修改文件信息

```http
PUT /api/files/{fileId}
```

### Request

```json
{
  "name": "后台管理原型 v1",
  "folderId": 2
}
```

---

## 8.5 删除文件

```http
DELETE /api/files/{fileId}
```

### 规则

V1 无回收站，前端必须二次确认。

---

## 8.6 HTML 页面目录

```http
GET /api/files/{fileId}/pages
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "首页",
      "relativePath": "index.html",
      "isEntry": true,
      "children": []
    }
  ],
  "message": "ok"
}
```

---

## 8.7 预览资源访问

```http
GET /api/preview/files/{fileId}/resource?path=index.html
```

### 权限

需要 `can_view = true`，或为主管理员 / 子管理员。

### 规则

1. path 不允许包含 `../`。
2. path 不允许为绝对路径。
3. 根据文件后缀返回正确 Content-Type。
4. 所有 HTML、CSS、JS、图片都通过该接口访问。

---

## 9. File Permission 文件权限接口

## 9.1 查看文件权限

```http
GET /api/files/{fileId}/permissions
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "userId": 2,
      "username": "dev01",
      "canView": true,
      "canComment": true,
      "canEdit": false,
      "canDelete": false
    }
  ],
  "message": "ok"
}
```

---

## 9.2 设置文件权限

```http
PUT /api/files/{fileId}/permissions
```

### Request

```json
{
  "permissions": [
    {
      "userId": 2,
      "canView": true,
      "canComment": true,
      "canEdit": false,
      "canDelete": false
    }
  ]
}
```

### 规则

1. 文件权限不继承。
2. 每个用户、每个文件单独配置。
3. 设置权限时 upsert `file_permissions`。

---

## 9.3 移除文件权限

```http
DELETE /api/files/{fileId}/permissions/{userId}
```

---

## 10. Share Link 分享接口

## 10.1 创建分享链接

```http
POST /api/files/{fileId}/share-links
```

### Request

```json
{
  "shareType": "team_invite",
  "permission": "comment",
  "validDays": 7
}
```

### 字段规则

| 字段 | 规则 |
|---|---|
| shareType | `team_invite` / `file_only` |
| permission | `view` / `comment` / `edit` |
| validDays | 必填；正整数；表示有效期天数 |

### Response

```json
{
  "success": true,
  "data": {
    "shareLinkId": 1,
    "url": "https://example.com/share/abc123",
    "token": "abc123",
    "expiresAt": "2026-07-17T08:00:00Z"
  },
  "message": "分享链接创建成功"
}
```

---

## 10.2 获取分享链接信息

```http
GET /api/share-links/{token}
```

### Response

```json
{
  "success": true,
  "data": {
    "token": "abc123",
    "fileId": 1001,
    "fileName": "后台管理原型",
    "teamId": 1,
    "teamName": "产品团队",
    "shareType": "team_invite",
    "permission": "comment",
    "expiresAt": "2026-07-17T08:00:00Z",
    "isExpired": false,
    "isRevoked": false
  },
  "message": "ok"
}
```

---

## 10.3 接受分享授权

```http
POST /api/share-links/{token}/accept
```

### 规则

1. 未登录返回 `UNAUTHORIZED`。
2. 过期返回 `SHARE_LINK_EXPIRED`。
3. 已撤销返回 `SHARE_LINK_REVOKED`。
4. `team_invite`：加入团队 + 写入文件权限。
5. `file_only`：仅写入文件权限，不加入团队。

### Response

```json
{
  "success": true,
  "data": {
    "fileId": 1001,
    "teamJoined": true,
    "redirectUrl": "/files/1001/preview"
  },
  "message": "授权成功"
}
```

---

## 10.4 撤销分享链接

```http
POST /api/share-links/{shareLinkId}/revoke
```

### Response

```json
{
  "success": true,
  "data": null,
  "message": "分享链接已撤销"
}
```

---

## 11. Comment 评论接口

## 11.1 页面评论列表

```http
GET /api/files/{fileId}/pages/{pageId}/comments
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "x": 0.32,
      "y": 0.48,
      "content": "这里按钮文案需要调整",
      "user": {
        "id": 2,
        "username": "pm01"
      },
      "replies": [
        {
          "id": 11,
          "content": "收到，我改成提交",
          "user": {
            "id": 3,
            "username": "dev01"
          },
          "createdAt": "2026-07-10T08:10:00Z"
        }
      ],
      "createdAt": "2026-07-10T08:00:00Z"
    }
  ],
  "message": "ok"
}
```

---

## 11.2 新增评论

```http
POST /api/files/{fileId}/pages/{pageId}/comments
```

### Request

```json
{
  "x": 0.32,
  "y": 0.48,
  "content": "这里按钮文案需要调整"
}
```

### 权限

需要 `can_comment = true`。

---

## 11.3 新增评论回复

```http
POST /api/comments/{commentId}/replies
```

### Request

```json
{
  "content": "收到，我改成提交"
}
```

### 权限

需要对应文件 `can_comment = true`。

---

## 11.4 评论回复列表

```http
GET /api/comments/{commentId}/replies
```

---

## 12. 前端路由建议

| 页面 | 路由 |
|---|---|
| 登录 | `/login` |
| 注册 | `/register` |
| 忘记密码 | `/forgot-password` |
| 我的团队 | `/teams` |
| 团队详情 | `/teams/:teamId` |
| 项目详情 | `/projects/:projectId` |
| 文件预览 | `/files/:fileId/preview` |
| 分享访问 | `/share/:token` |
| 个人设置 | `/settings/account` |
| 用户管理 | `/admin/users` |

---

## 13. 最小联调链路

### 13.1 登录到上传

```text
POST /auth/register
→ POST /auth/login
→ POST /teams
→ POST /teams/{teamId}/projects
→ POST /projects/{projectId}/files/upload
→ GET /files/{fileId}/pages
→ GET /preview/files/{fileId}/resource?path=index.html
```

### 13.2 分享链路

```text
POST /files/{fileId}/share-links
→ GET /share-links/{token}
→ POST /share-links/{token}/accept
→ GET /files/{fileId}
→ GET /preview/files/{fileId}/resource?path=index.html
```

### 13.3 评论链路

```text
GET /files/{fileId}/pages/{pageId}/comments
→ POST /files/{fileId}/pages/{pageId}/comments
→ POST /comments/{commentId}/replies
→ GET /files/{fileId}/pages/{pageId}/comments
```

---

## 14. 接口验收重点

1. 普通员工调用创建团队接口应返回 `FORBIDDEN`。
2. 超过 100MB 的 ZIP 上传应返回 `FILE_TOO_LARGE`。
3. 非 ZIP 文件上传应返回 `INVALID_FILE_TYPE`。
4. 分享链接过期应返回 `SHARE_LINK_EXPIRED`。
5. 分享链接撤销后应返回 `SHARE_LINK_REVOKED`。
6. 无 `can_view` 用户访问预览资源应返回 `FORBIDDEN`。
7. 无 `can_comment` 用户新增评论或回复应返回 `FORBIDDEN`。
8. 文件权限不应从团队、项目、文件夹继承。
9. Axure 复杂动态面板资源应能通过预览资源接口正常加载。
10. 评论和回复内容需要 XSS 过滤。
