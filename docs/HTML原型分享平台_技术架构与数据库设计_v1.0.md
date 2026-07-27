# 技术架构与数据库设计：HTML 原型分享平台 v1.0

> 文档版本：v1.0  
> 创建时间：2026-07-10  
> 关联 PRD：`HTML原型分享平台_PRD_v1.0.md`  
> 文档用途：供研发进行技术方案评审、数据库建模、接口设计、任务拆分与开发实现  
> 当前范围：V1 / MVP

---

## 1. 技术设计目标

### 1.1 建设目标

本系统需要建设一个企业内部可自建的 HTML 原型分享平台，支持：

1. 用户注册、登录、忘记密码、修改密码。
2. 主管理员 / 子管理员 / 员工角色权限。
3. 团队空间、项目、文件夹、文件层级管理。
4. ZIP 格式 HTML 原型包上传、解压、解析和在线预览。
5. Axure RP 导出的复杂 HTML ZIP 包预览，兼容动态面板和页面树。
6. 文件级查看、评论、编辑、删除权限。
7. 分享链接有效期与撤销。
8. iframe 原型预览。
9. 标注模式。
10. 评论和评论回复。

### 1.2 关键技术约束

| 约束项 | 结论 |
|---|---|
| 首版上传格式 | 仅支持 `.zip` |
| ZIP 上传大小 | 最大 100MB |
| 解压后总大小 | 不限制 |
| HTML 页面数量 | 不限制 |
| 权限继承 | 不继承，资源权限单独配置 |
| 团队创建权限 | 仅主管理员、子管理员可创建团队 |
| 普通员工 | 不可创建团队 |
| 分享链接 | 支持有效期天数和撤销 |
| Axure 支持 | 需兼容复杂动态面板和页面树 |
| 评论能力 | 支持评论、评论回复；不做解决状态和通知 |
| 回收站 | V1 不做，删除采用二次确认后直接删除 |

---

## 2. 推荐技术栈

> 技术栈可根据团队实际能力调整。以下方案以“开发效率、维护成本、安全性、私有化部署友好”为优先。

### 2.1 前端

| 项 | 推荐 |
|---|---|
| 框架 | React + TypeScript |
| 构建工具 | Vite |
| UI 组件 | Ant Design / Arco Design |
| 状态管理 | Zustand / React Query |
| 路由 | React Router |
| HTTP | Axios / Fetch wrapper |
| 原型预览 | iframe + sandbox |
| 标注实现 | iframe 注入 inspector script + postMessage |

### 2.2 后端

| 项 | 推荐 |
|---|---|
| 运行时 | Node.js |
| 框架 | NestJS / Express + TypeScript |
| ORM | Prisma / TypeORM |
| 鉴权 | Session Cookie 或 JWT；V1 推荐 Session Cookie |
| 文件上传 | multipart/form-data |
| ZIP 解压 | yauzl / unzipper / adm-zip，需安全封装 |
| 静态资源服务 | 受控文件访问路由，不直接暴露裸目录 |

### 2.3 数据库与存储

| 项 | 推荐 |
|---|---|
| 关系数据库 | PostgreSQL / MySQL |
| 缓存 | Redis，可选，V1 非必需 |
| 文件存储 | 本地磁盘 / 对象存储兼容层 |
| 日志 | 文件日志 + 数据库关键操作记录 |

### 2.4 推荐部署形态

V1 暂不需要一键私有化安装包，但系统设计应便于后续容器化：

```text
Nginx
 ├── Frontend Static Assets
 └── Backend API
      ├── Database
      └── File Storage
```

建议预留 Docker 化能力，但 V1 不作为强制交付项。

---

## 3. 总体架构

### 3.1 逻辑架构

```text
浏览器端
├── 登录/注册页面
├── 团队/项目/文件管理页面
├── 原型预览页面
│   ├── iframe HTML 预览
│   ├── 标注 Inspector Layer
│   └── 评论 Layer
└── 管理后台页面

后端 API 服务
├── Auth 模块
├── User / Role 模块
├── Team 模块
├── Project 模块
├── Folder 模块
├── Prototype File 模块
├── Upload & Parse 模块
├── Permission 模块
├── Share Link 模块
├── Comment 模块
└── Preview Resource 模块

数据层
├── 关系数据库
├── 原始 ZIP 存储
├── 解压后 HTML 资源存储
└── 日志
```

### 3.2 模块职责

| 模块 | 职责 |
|---|---|
| Auth | 注册、登录、登出、忘记密码、修改密码、登录态校验 |
| User | 用户列表、用户角色、删除用户、禁用用户 |
| Team | 团队创建、编辑、删除、成员管理 |
| Project | 项目 CRUD |
| Folder | 文件夹 CRUD |
| PrototypeFile | 原型文件记录、状态、权限、详情 |
| UploadParse | ZIP 上传、校验、解压、HTML 扫描、页面目录生成 |
| Permission | 文件级权限、新增文件权限、鉴权中间件 |
| ShareLink | 链接生成、有效期、撤销、访问授权 |
| Preview | iframe 预览资源鉴权与返回 |
| Inspector | 前端标注脚本、元素信息采集 |
| Comment | 评论、评论回复 |

---

## 4. 目录与存储设计

### 4.1 文件存储目录建议

```text
/storage
├── uploads
│   └── {file_id}
│       └── original.zip
├── extracted
│   └── {file_id}
│       ├── index.html
│       ├── page1.html
│       ├── assets
│       └── ...
└── temp
    └── {upload_task_id}
```

### 4.2 存储规则

1. 原始 ZIP 保存在 `/storage/uploads/{file_id}/original.zip`。
2. 解压文件保存在 `/storage/extracted/{file_id}/`。
3. 不使用用户上传文件名作为真实存储目录名。
4. 数据库记录用户原始文件名。
5. 静态资源必须通过后端受控路由访问，不建议直接 Nginx 暴露整个 extracted 目录。
6. 预览 HTML、CSS、JS、图片访问时需要校验用户是否有文件查看权限或分享授权。

### 4.3 文件访问 URL 设计

建议所有原型资源通过如下路径访问：

```text
GET /api/preview/files/{fileId}/resource?path={relativePath}
```

示例：

```text
/api/preview/files/1001/resource?path=index.html
/api/preview/files/1001/resource?path=assets/app.js
/api/preview/files/1001/resource?path=images/demo.png
```

后端流程：

```text
校验登录态
→ 校验 fileId 权限
→ 校验 path 安全性
→ 定位 storage/extracted/{fileId}/{path}
→ 设置响应头
→ 返回文件内容
```

---

## 5. 数据库设计

> 以下以 PostgreSQL/MySQL 通用字段表示。实际类型可根据选型调整。  
> 建议所有表都保留 `created_at`、`updated_at`。  
> 删除 V1 可使用物理删除；如研发希望保留审计，可使用 `deleted_at` 软删除，但产品 V1 不要求回收站。

### 5.1 users 用户表

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'employee',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

#### 字段说明

| 字段 | 说明 |
|---|---|
| username | 仅英文字母或数字，长度 5 位以上，唯一 |
| password_hash | 密码哈希，不允许明文存储 |
| role | `super_admin` / `sub_admin` / `employee` |
| status | `active` / `disabled` |

#### 索引

```sql
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

---

### 5.2 teams 团队表

```sql
CREATE TABLE teams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  owner_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

#### 规则

1. 仅主管理员、子管理员可创建团队。
2. 创建人自动加入团队成员表。
3. 普通员工不可创建团队。

---

### 5.3 team_members 团队成员表

```sql
CREATE TABLE team_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  can_upload BOOLEAN NOT NULL DEFAULT FALSE,
  join_source VARCHAR(32) NOT NULL DEFAULT 'manual',
  joined_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### join_source 枚举

| 值 | 说明 |
|---|---|
| manual | 管理员手动添加 |
| invite_link | 团队邀请链接加入 |
| share_link | 文件分享链接加入团队 |

---

### 5.4 projects 项目表

```sql
CREATE TABLE projects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  creator_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

#### 索引

```sql
CREATE INDEX idx_projects_team_id ON projects(team_id);
```

---

### 5.5 folders 文件夹表

```sql
CREATE TABLE folders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  name VARCHAR(100) NOT NULL,
  creator_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_id) REFERENCES folders(id),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

#### 规则

1. 文件夹可多级。
2. 权限不继承。
3. 删除文件夹 V1 直接删除，需二次确认。
4. 删除时需处理子文件夹、文件、页面、评论和评论回复。

---

### 5.6 prototype_files 原型文件表

```sql
CREATE TABLE prototype_files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  folder_id BIGINT NULL,
  name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  original_zip_path VARCHAR(500) NOT NULL,
  extracted_path VARCHAR(500) NULL,
  file_size BIGINT NOT NULL,
  parse_status VARCHAR(32) NOT NULL DEFAULT 'parsing',
  parse_error TEXT NULL,
  entry_page_id BIGINT NULL,
  page_count INT NOT NULL DEFAULT 0,
  uploader_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (folder_id) REFERENCES folders(id),
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);
```

#### parse_status 枚举

| 值 | 说明 |
|---|---|
| parsing | 解析中 |
| success | 解析成功 |
| failed | 解析失败 |

#### 规则

1. 仅支持 ZIP。
2. ZIP 原始文件最大 100MB。
3. 解压后文件总大小不限制。
4. HTML 页面数量不限制。
5. 需要记录 `page_count`，方便列表展示和排查。

---

### 5.7 prototype_pages HTML 页面表

```sql
CREATE TABLE prototype_pages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_id BIGINT NOT NULL,
  title VARCHAR(255) NULL,
  relative_path VARCHAR(1000) NOT NULL,
  directory_path VARCHAR(1000) NULL,
  is_entry BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (file_id) REFERENCES prototype_files(id)
);
```

#### 规则

1. 每个 HTML 文件生成一条页面记录。
2. `relative_path` 用于预览资源定位。
3. `title` 优先读取 HTML `<title>`，没有则用文件名。
4. 入口页选择规则：根目录 `index.html` > 最浅层级 `index.html` > 扫描到的第一个 HTML。

---

### 5.8 file_permissions 文件权限表

```sql
CREATE TABLE file_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_comment BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE (file_id, user_id),
  FOREIGN KEY (file_id) REFERENCES prototype_files(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);
```

#### 权限说明

| 字段 | 含义 |
|---|---|
| can_view | 可查看文件和预览 |
| can_comment | 可添加评论和回复评论 |
| can_edit | 可修改文件信息或替换文件 |
| can_delete | 可删除文件 |

#### 关键规则

1. 权限不继承。
2. 文件权限按用户、文件单独配置。
3. 分享给团队成员本质是写入或更新 file_permissions。
4. 外部仅分享文件授权本质也是写入 file_permissions，但不写 team_members。

---

### 5.9 share_links 分享链接表

```sql
CREATE TABLE share_links (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(128) NOT NULL UNIQUE,
  file_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  share_type VARCHAR(32) NOT NULL,
  permission VARCHAR(32) NOT NULL DEFAULT 'view',
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (file_id) REFERENCES prototype_files(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### share_type 枚举

| 值 | 说明 |
|---|---|
| team_invite | 邀请加入团队 |
| file_only | 仅分享文件 |

#### permission 枚举

| 值 | 授权结果 |
|---|---|
| view | can_view = true |
| comment | can_view = true, can_comment = true |
| edit | can_view = true, can_comment = true, can_edit = true |

#### 规则

1. 分享链接必须设置有效期天数，并计算 `expires_at`。
2. 分享链接支持撤销，撤销时写入 `revoked_at`。
3. token 必须不可预测，建议使用安全随机数。
4. 链接过期或撤销后不可继续授权。
5. `team_invite`：登录后写入 team_members + file_permissions。
6. `file_only`：登录后仅写入 file_permissions，不加入团队。

---

### 5.10 comments 评论表

```sql
CREATE TABLE comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_id BIGINT NOT NULL,
  page_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  x DECIMAL(10,4) NOT NULL,
  y DECIMAL(10,4) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (file_id) REFERENCES prototype_files(id),
  FOREIGN KEY (page_id) REFERENCES prototype_pages(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 坐标设计建议

建议 `x`、`y` 存相对坐标，而不是绝对像素：

```text
x = clickX / pageWidth
y = clickY / pageHeight
```

优势：

1. 页面缩放后评论点位置更稳定。
2. 不同视口下更容易还原评论位置。

---

### 5.11 comment_replies 评论回复表

```sql
CREATE TABLE comment_replies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  comment_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (comment_id) REFERENCES comments(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 规则

1. 回复必须归属于某条评论。
2. 回复内容不能为空。
3. 回复内容需做 XSS 过滤。
4. V1 不做评论解决状态。
5. V1 不做评论通知。

---

### 5.12 operation_logs 操作日志表，建议保留

虽然 V1 不做完整操作日志后台，但建议保留关键操作日志表，便于排查问题。

```sql
CREATE TABLE operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id BIGINT NULL,
  detail TEXT NULL,
  ip VARCHAR(64) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL
);
```

建议记录：

1. 登录成功 / 失败。
2. 上传 ZIP。
3. 解析失败。
4. 生成分享链接。
5. 撤销分享链接。
6. 删除文件 / 项目 / 团队。
7. 修改用户角色。

---

## 6. 权限鉴权设计

### 6.1 系统角色权限

```text
super_admin：系统全部权限
sub_admin：除指定管理员外的大部分管理权限
employee：普通员工权限
```

### 6.2 创建团队鉴权

```text
if user.role in ['super_admin', 'sub_admin']:
    allow
else:
    deny
```

### 6.3 查看文件鉴权

用户满足任一条件即可查看文件：

1. 用户是主管理员。
2. 用户是子管理员。
3. 用户在 `file_permissions` 中对该文件有 `can_view = true`。
4. 用户通过有效分享链接完成授权后，已写入 file_permissions。

伪代码：

```ts
async function canViewFile(userId, fileId) {
  const user = await getUser(userId)
  if (user.role === 'super_admin' || user.role === 'sub_admin') return true

  const permission = await getFilePermission(fileId, userId)
  return Boolean(permission?.can_view)
}
```

### 6.4 评论鉴权

```text
can_comment = true 才能新增评论或回复评论
can_view = true 才能查看评论和回复
```

### 6.5 编辑 / 删除鉴权

| 操作 | 需要权限 |
|---|---|
| 编辑文件信息 | can_edit |
| 删除文件 | can_delete |
| 上传新文件 | team_members.can_upload = true，或主管理员 / 子管理员 |
| 设置文件权限 | 主管理员 / 子管理员，或后续扩展文件所有者 |

### 6.6 权限不继承实现

系统不从团队、项目、文件夹继承文件权限。每个文件都需要独立的 `file_permissions` 记录。

因此，查询文件列表时：

1. 主管理员、子管理员可查看全部或管理范围内文件。
2. 普通员工仅能看到自己有 `can_view` 的文件。
3. 即使用户在团队中，如果没有某文件 `can_view`，也不可查看该文件。

---

## 7. ZIP 上传与解析设计

### 7.1 上传流程

```text
前端选择 ZIP
→ POST /api/files/upload
→ 后端校验登录态
→ 后端校验团队/项目/文件夹存在
→ 后端校验用户可新增文件
→ 校验文件类型为 ZIP
→ 校验文件大小 <= 100MB
→ 创建 prototype_files 记录，parse_status = parsing
→ 保存 original.zip
→ 解压到 extracted/{file_id}
→ 扫描 HTML 页面
→ 生成 prototype_pages
→ 选择入口页
→ 更新 parse_status = success
```

### 7.2 安全解压要求

必须防止以下风险：

| 风险 | 处理方式 |
|---|---|
| Zip Slip 路径穿越 | 解压前规范化路径，禁止 `../` 跳出目标目录 |
| 覆盖系统文件 | 只允许写入 `{file_id}` 专属目录 |
| 危险文件执行 | 不执行上传内容，只作为静态资源返回 |
| HTML XSS | iframe sandbox 隔离；平台页面不直接插入原型 HTML |
| 超大 ZIP | 上传前限制 100MB |

### 7.3 HTML 扫描规则

1. 递归扫描 `.html` / `.htm` 文件。
2. 生成页面目录树。
3. 记录每个 HTML 的相对路径。
4. 提取 HTML `<title>` 作为页面标题。
5. 若是 Axure 包，需要优先识别页面树相关文件，但不能破坏原始目录结构。

### 7.4 Axure 包兼容要求

Axure RP 导出包通常包含：

```text
index.html
start.html
files/
resources/
data/
```

V1 要求：

1. 保持 Axure 原始目录结构。
2. 保持页面跳转可用。
3. 保持复杂动态面板交互可用。
4. 保持页面树可用。
5. 保持图片、CSS、JS、data 文件正常加载。

技术建议：

1. 不重写 Axure 文件内容，优先通过受控静态资源路径映射保持相对路径。
2. iframe 预览时确保资源同源加载。
3. 如必须重写路径，需要完整覆盖 HTML、CSS、JS 中的相对路径引用，风险较高，不作为首选。

---

## 8. 预览与资源访问设计

### 8.1 预览页加载流程

```text
GET /prototype-files/{fileId}/preview
→ 前端请求文件详情
→ 请求页面目录
→ 请求入口页资源 URL
→ iframe 加载 /api/preview/files/{fileId}/resource?path={entryPath}
```

### 8.2 iframe sandbox 建议

iframe 建议使用：

```html
<iframe
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
  src="/api/preview/files/{fileId}/resource?path=index.html"
/>
```

说明：

| sandbox 权限 | 原因 |
|---|---|
| allow-scripts | 原型交互需要 JS |
| allow-forms | 部分原型可能有表单演示 |
| allow-same-origin | 标注脚本和资源访问可能需要同源能力 |
| allow-popups | 部分原型可能打开新页面 |

安全注意：

1. 不允许 iframe 访问父页面敏感对象。
2. 平台页面与预览资源最好使用隔离路径或子域。
3. 若后续安全要求更高，可考虑预览资源独立域名。

---

## 9. 标注 Inspector 技术设计

### 9.1 实现思路

```text
预览页开启标注模式
→ 向 iframe 注入 inspector 脚本
→ iframe 内监听 mousemove / click
→ 获取目标元素 getBoundingClientRect
→ 获取 computedStyle
→ postMessage 给父页面
→ 父页面展示 hover 框和属性面板
```

### 9.2 采集字段

| 字段 | 获取方式 |
|---|---|
| width / height | getBoundingClientRect |
| x / y | getBoundingClientRect |
| font-size | getComputedStyle |
| font-weight | getComputedStyle |
| line-height | getComputedStyle |
| color | getComputedStyle |
| background-color | getComputedStyle |
| border | getComputedStyle |
| border-radius | getComputedStyle |
| padding | getComputedStyle |
| margin | getComputedStyle |
| 到页面边界距离 | boundingClientRect + document size |

### 9.3 postMessage 数据结构

```ts
interface InspectElementPayload {
  type: 'INSPECT_ELEMENT'
  fileId: number
  pageId: number
  rect: {
    x: number
    y: number
    width: number
    height: number
    top: number
    right: number
    bottom: number
    left: number
  }
  style: {
    fontSize?: string
    fontWeight?: string
    lineHeight?: string
    color?: string
    backgroundColor?: string
    border?: string
    borderRadius?: string
    padding?: string
    margin?: string
  }
  distance: {
    top: number
    right: number
    bottom: number
    left: number
  }
}
```

### 9.4 风险

1. Axure 页面 JS 较复杂，注入 inspector 需避免影响原有脚本。
2. iframe sandbox 配置过严会导致无法读取 DOM。
3. 跨域会导致无法访问 iframe DOM，因此 V1 应确保预览资源同源。

---

## 10. 评论与回复技术设计

### 10.1 评论坐标

建议存储相对坐标：

```text
x_ratio = click_x / iframe_document_width
y_ratio = click_y / iframe_document_height
```

展示时：

```text
render_x = x_ratio * current_document_width
render_y = y_ratio * current_document_height
```

### 10.2 评论接口关系

```text
prototype_files 1 - n comments
prototype_pages 1 - n comments
comments 1 - n comment_replies
users 1 - n comments
users 1 - n comment_replies
```

### 10.3 权限

| 操作 | 权限 |
|---|---|
| 查看评论 | can_view |
| 新增评论 | can_comment |
| 回复评论 | can_comment |

### 10.4 XSS 防护

1. 评论和回复入库前做服务端过滤。
2. 前端渲染时转义 HTML。
3. 不允许评论内容以 HTML 执行。

---

## 11. API 接口设计建议

### 11.1 Auth

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/auth/reset-password` | 忘记密码，重置并返回临时密码 |
| POST | `/api/auth/change-password` | 修改密码 |
| GET | `/api/auth/me` | 当前用户信息 |

### 11.2 Team

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/teams` | 我的团队列表 |
| POST | `/api/teams` | 创建团队，仅管理员/子管理员 |
| GET | `/api/teams/{teamId}` | 团队详情 |
| PUT | `/api/teams/{teamId}` | 修改团队 |
| DELETE | `/api/teams/{teamId}` | 删除团队 |
| GET | `/api/teams/{teamId}/members` | 成员列表 |
| POST | `/api/teams/{teamId}/members` | 按用户名添加成员 |
| DELETE | `/api/teams/{teamId}/members/{userId}` | 移除成员 |
| PUT | `/api/teams/{teamId}/members/{userId}/upload-permission` | 设置是否可新增文件 |

### 11.3 Project / Folder

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/teams/{teamId}/projects` | 项目列表 |
| POST | `/api/teams/{teamId}/projects` | 创建项目 |
| PUT | `/api/projects/{projectId}` | 修改项目 |
| DELETE | `/api/projects/{projectId}` | 删除项目 |
| GET | `/api/projects/{projectId}/folders` | 文件夹树 |
| POST | `/api/projects/{projectId}/folders` | 创建文件夹 |
| PUT | `/api/folders/{folderId}` | 修改文件夹 |
| DELETE | `/api/folders/{folderId}` | 删除文件夹 |

### 11.4 Prototype File

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/projects/{projectId}/files` | 文件列表 |
| POST | `/api/projects/{projectId}/files/upload` | 上传 ZIP |
| GET | `/api/files/{fileId}` | 文件详情 |
| PUT | `/api/files/{fileId}` | 修改文件信息 |
| DELETE | `/api/files/{fileId}` | 删除文件 |
| GET | `/api/files/{fileId}/pages` | HTML 页面目录 |
| GET | `/api/preview/files/{fileId}/resource` | 预览资源访问 |

### 11.5 Permission

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/files/{fileId}/permissions` | 查看文件权限 |
| PUT | `/api/files/{fileId}/permissions` | 设置文件权限 |
| DELETE | `/api/files/{fileId}/permissions/{userId}` | 移除文件权限 |

### 11.6 Share Link

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/files/{fileId}/share-links` | 生成分享链接 |
| GET | `/api/share-links/{token}` | 获取分享链接信息 |
| POST | `/api/share-links/{token}/accept` | 登录后接受分享授权 |
| POST | `/api/share-links/{shareLinkId}/revoke` | 撤销分享链接 |

生成分享链接请求：

```json
{
  "shareType": "team_invite",
  "permission": "comment",
  "validDays": 7
}
```

### 11.7 Comment

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/files/{fileId}/pages/{pageId}/comments` | 当前页面评论列表 |
| POST | `/api/files/{fileId}/pages/{pageId}/comments` | 新增评论 |
| POST | `/api/comments/{commentId}/replies` | 新增评论回复 |
| GET | `/api/comments/{commentId}/replies` | 评论回复列表 |

---

## 12. 关键业务流程时序

### 12.1 分享链接接受流程

```text
用户打开分享链接
→ GET /api/share-links/{token}
→ 判断 token 是否存在
→ 判断 revoked_at 是否为空
→ 判断 expires_at 是否过期
→ 未登录：跳转登录/注册，并保存 redirect token
→ 登录后 POST /api/share-links/{token}/accept
→ if share_type = team_invite:
      upsert team_members
      upsert file_permissions
  else if share_type = file_only:
      upsert file_permissions
→ 跳转预览页
```

### 12.2 预览资源鉴权流程

```text
iframe 请求资源
→ GET /api/preview/files/{fileId}/resource?path=xxx
→ 校验登录态
→ 校验 can_view
→ 校验 path 不包含 ../ 或绝对路径
→ 拼接 extracted_path
→ 判断文件存在
→ 设置 Content-Type
→ 返回文件内容
```

### 12.3 删除文件流程

```text
用户点击删除文件
→ 前端二次确认
→ DELETE /api/files/{fileId}
→ 校验 can_delete
→ 删除 comment_replies
→ 删除 comments
→ 删除 prototype_pages
→ 删除 file_permissions
→ 删除 share_links
→ 删除 prototype_files
→ 删除磁盘文件 original.zip 和 extracted 目录
```

---

## 13. 安全设计

### 13.1 密码安全

1. 密码必须使用 bcrypt / argon2 哈希。
2. 不允许明文存储。
3. 重置密码生成随机临时密码。
4. 重置后的密码返回给前端弹窗展示。

### 13.2 分享链接安全

1. token 使用安全随机数，长度建议 32 字节以上。
2. 分享链接必须登录后才能完成授权。
3. 过期链接不可授权。
4. 撤销链接不可授权。

### 13.3 文件安全

1. ZIP 上传限制 100MB。
2. 解压路径必须做规范化。
3. 不执行上传内容。
4. 预览资源必须鉴权访问。
5. iframe sandbox 隔离。

### 13.4 XSS 防护

1. 评论和回复内容转义。
2. 平台页面不直接 innerHTML 渲染用户输入。
3. 原型 HTML 在 iframe 中隔离。

---

## 14. 开发拆分建议

### 14.1 后端任务

1. 用户注册 / 登录 / 密码模块。
2. 用户角色模块。
3. 团队与成员模块。
4. 项目与文件夹模块。
5. 文件上传与 ZIP 解压模块。
6. HTML 页面扫描模块。
7. 权限模块。
8. 预览资源服务模块。
9. 分享链接模块。
10. 评论与回复模块。
11. 操作日志模块。
12. 安全加固。

### 14.2 前端任务

1. 登录 / 注册 / 忘记密码 / 修改密码页面。
2. 我的团队页面。
3. 团队详情与成员管理页面。
4. 项目详情页面。
5. 文件夹和文件列表。
6. ZIP 上传弹窗。
7. 文件权限弹窗。
8. 分享弹窗。
9. 原型预览页。
10. 页面目录树。
11. 标注模式。
12. 评论与回复面板。

### 14.3 联调优先级

1. 注册登录。
2. 团队 / 项目 / 文件夹。
3. ZIP 上传解析。
4. iframe 预览。
5. 文件权限。
6. 分享链接。
7. 评论与回复。
8. 标注模式。

---

## 15. 技术风险与验证项

| 风险 | 等级 | 验证方式 |
|---|---|---|
| Axure 复杂动态面板兼容 | 高 | 准备复杂 Axure ZIP 样例进行上传预览验证 |
| 页面树识别 | 中 | 使用多层页面目录 ZIP 测试 |
| iframe 标注脚本注入 | 高 | 做技术 Spike，验证同源 iframe DOM 读取 |
| ZIP 解压安全 | 高 | 使用路径穿越 ZIP 测试 |
| 权限不继承导致配置复杂 | 中 | 文件列表、分享、授权接口统一走 file_permissions |
| 评论坐标适配不同视口 | 中 | 使用相对坐标测试缩放场景 |

---

## 16. 最小技术验证 Demo

建议研发先做一个技术 Spike，验证以下链路：

```text
登录
→ 上传 100MB 以内 ZIP
→ 解压并识别 HTML
→ 预览 Axure 复杂动态面板页面
→ 页面树切换
→ iframe 内开启标注并读取 DOM 样式
→ 添加评论和回复
→ 生成 7 天有效分享链接
→ 撤销分享链接后访问失败
```

验收通过后，再进入完整功能开发。

---

## 17. 结论

V1 技术实现的关键不是普通文件上传，而是四条主链路：

1. **安全上传解析链路**：ZIP 上传、解压、HTML 扫描、Axure 兼容。
2. **强权限访问链路**：登录、角色、团队、文件级权限、分享授权。
3. **受控预览链路**：iframe 预览、资源鉴权、路径安全。
4. **协作评审链路**：标注、评论、回复。

研发需要优先完成 Axure 兼容和 iframe 标注的技术验证，因为这两项风险最高，直接决定 V1 的可交付质量。
