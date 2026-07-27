# HyperDesign 今日开发任务记录

> 日期：2026-07-17
> 状态：Sprint 4 已完成；真实 Axure ZIP 测试问题已修复

## 一、今日目标

1. 完成 Sprint 4：文件级权限、受控预览资源、Viewer 真实化收尾；
2. 让当前前后端可供测试；
3. 使用真实 Axure 导出 ZIP 验证上传、解析和在线预览；
4. 根据测试反馈修复登录、上传入口、文件名和预览完整性问题。

---

## 二、Sprint 4 完成交付

### 1. 文件级权限

新增 `FilePermission` 数据模型与用户、原型文件关系，支持以下独立能力：

- `canView`：查看文件、页面目录和预览资源；
- `canComment`：评论权限（Sprint 5 评论持久化接入时复用）；
- `canEdit`：编辑权限；
- `canDelete`：删除权限。

规则：

- 新上传 ZIP 的上传者自动拥有完整权限；
- 文件列表、页面目录和受控预览资源均执行文件级权限校验；
- 为兼容历史数据，旧文件的上传者保留可见权；
- 项目级权限仍是文件级权限的前置条件。

### 2. 文件权限管理

在项目详情页每个文件行新增 🔐 文件权限入口：

- 可查看项目团队成员、成员角色、上传者标记和现有文件权限；
- 可配置查看 / 评论 / 编辑 / 删除；
- 取消“查看”将联动取消另外三类能力；
- 上传者完整权限固定，避免误操作将上传者锁出。

新增 API：

```text
GET /api/projects/:projectId/files/:fileId/permissions
GET /api/files/:fileId/permissions/me
PUT /api/projects/:projectId/files/:fileId/permissions/:userId
```

### 3. Viewer 与预览资源

- Viewer 的项目、文件、页面目录、当前文件权限均改由真实 API 驱动；
- 项目切换通过 `GET /api/projects/:projectId/first-preview` 获取实际可预览文件和入口页；
- Viewer iframe 统一走登录态下的受控资源路由；
- 资源路由包含路径校验、防路径穿越、MIME 输出、`private, no-store`、`nosniff` 和 sandbox CSP；
- 左侧常用导航移除 `project-1`、`file-1`、`team-1` 演示链接，改为真实用户可访问的项目、原型和团队。

### 4. Sprint 4 权限回归

真实 API 验证：

```text
权限成员列表                         200
有项目权限但无文件查看权限             拒绝
授予 canView 后页面目录                200
授予 canView 后受控预览资源             200
未登录直链受控预览资源                  401
预览资源 Cache-Control                 private, no-store
预览资源 CSP                           已返回
```

---

## 三、测试环境问题与修复

### 1. 登录失败

**现象**：前端登录请求失败。

**根因**：Vite 代理仍指向旧后端端口 `3000`，实际 NestJS 服务运行在 `3001`。

**修复**：`vite.config.ts` 改为读取 `VITE_API_TARGET`，默认指向 `http://localhost:3001`；前端服务已重启。

**验证**：经前端代理调用登录接口返回 `201`，同时返回 Session Cookie。

### 2. 上传 ZIP 按钮无响应 / 白字缺失

**处理**：

- 明确区分项目编辑权限和查看权限：查看者显示“仅查看权限”并提供原因提示；
- 编辑者显示“上传 ZIP”且打开上传弹窗；
- 主按钮显式应用白色文字与禁用态白色透明文字样式。

### 3. 中文 ZIP 文件名乱码

测试文件：

```text
C:\Users\Chris J\Documents\产品文档\HSB2B-小程序-演示版本.zip
```

**根因**：上传 multipart 文件名发生 UTF-8 字节被 Latin-1 误解码，原始乱码直接入库。

**修复**：上传端增加文件名恢复逻辑，将可安全恢复的 Latin-1 mojibake 转回 UTF-8；同时已修复当前测试记录名称。

当前文件名：

```text
HSB2B-小程序-演示版本
```

### 4. Axure 原型预览不完整

**根因**：标准 Axure 导出包中：

```text
start_with_pages.html → start.html → Axure Player → 业务页面
```

原逻辑错误地选择 `index.html` 作为入口；该文件是 Player 外壳，内部主 iframe 初始为 `about:blank`，导致完整启动流程被破坏。

**修复**：

- Axure 包识别 `start_with_pages.html` 作为优先入口；
- 不再将该启动页从页面扫描中排除；
- Viewer 改用路径式受控资源 URL，保持 Axure 内部相对 CSS、JS、图片、`data/`、`files/` 路径的上下文；
- 对该真实 ZIP 重新解析成功。

重新解析结果：

```text
解析状态：SUCCESS
文件名：HSB2B-小程序-演示版本
识别页面：7 个
入口页：start_with_pages.html
```

---

## 四、构建与验证

```text
Prisma validate / generate / db push    通过
Backend npm run build                   通过
Frontend npm run build                  通过
Frontend npm run lint                   0 error
```

前端 lint 仍有 6 个既有 warning（TeamDetailPage hook 依赖、Inspector 旧脚本及 Sprint 5 预留标注 helper），不影响本轮功能。

---

## 五、当前运行方式

```text
前端：http://127.0.0.1:5173
后端：http://127.0.0.1:3001
测试账号：chrisj / Demo123456
```

---

## 六、后续建议

下一阶段进入 Sprint 5：

1. 评论、回复、处理状态持久化；
2. 文件 + 页面 + 相对坐标的标注锚点；
3. 将 Viewer 已有本地评论交互接入真实协作数据；
4. 补后端 Jest/Supertest 测试与 CI 浏览器 E2E 环境。
