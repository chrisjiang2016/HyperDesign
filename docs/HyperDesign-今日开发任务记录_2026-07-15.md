# HyperDesign 今日开发任务记录

> 日期：2026-07-15  
> 记录时间：21:57 GMT+8  
> 状态：前端原型迁移完成，实际研发已启动；Sprint 0 / Sprint 1 首轮实现完成，Sprint 2 待开始。

---

## 一、今日目标与结果

| 目标 | 结果 |
|---|---|
| 将新版高保真原型迁移至现有 React 工程 | ✅ 完成阶段 0–3 |
| 打通 Viewer 真实 HTML 预览、实时标注与检查器 | ✅ 完成 |
| 明确项目切换与权限规则 | ✅ 完成并实现 mock 行为 |
| 输出实际前后端研发计划 | ✅ 完成 |
| 启动 Sprint 0 / Sprint 1 | ✅ 完成首轮可运行实现 |
| 用真实 Axure ZIP 验证上传解析与资源服务 | ✅ 完成并修复兼容问题 |

---

## 二、前端原型迁移与 Viewer（阶段 0–3）

### 2.1 设计对齐与页面迁移

采用 **方案 A：在现有 React 工程迁移 UI，不推倒重写**。

- 审阅新版高保真原型（9 个页面）并完成设计对齐。
- 冻结蓝色 SaaS 设计规范，主色：`#2563eb`。
- 建立设计 Token、Ant Design 主题、全局 Shell 样式。
- 完成 `AuthLayout`、`AppShellLayout`、`ViewerShellLayout`。
- 完成登录、注册、忘记密码、团队首页、团队详情、项目详情、个人设置等页面迁移。

### 2.2 Prototype Viewer

保留并升级既有核心能力：

- 真实 HTML iframe 原型预览。
- 原型内页面切换。
- 桌面 / 平板 / 移动端视口切换与缩放。
- 评论模式、临时标注、评论回复。
- 实时标注 Inspect：元素悬停、左键锁定、再次点击解锁、Esc 退出。
- 右侧检查器展示：尺寸、位置、距离、字体、颜色、圆角、Margin、Padding、边框、Border Width/Style、Box Shadow、最近兄弟间距。

### 2.3 Viewer 体验修复

- 将锁定后规格信息由页面浮层迁至右侧检查器。
- 修复 capture 阶段事件阻断造成的左键锁定失效问题。
- `inspector.js` 升级至 v7，补齐边框和阴影读取。
- 调整左栏顺序：

```text
当前项目 → 原型内页面 → 常用 → 本轮评审
```

---

## 三、ProjectSwitcher 与权限规则

### 3.1 Viewer 项目切换规则

下拉列表只显示：

```text
当前用户所在团队
∩
当前用户具备项目查看（view）或编辑（edit）权限的项目
```

无权限项目不显示。

### 3.2 跳转规则

在 Viewer 切换项目后：

```text
目标项目
→ 该项目首个可预览原型文件
→ 该文件的第一页
```

- 不再跳转项目详情页。
- URL 使用 `?page=<firstPageId>` 明确指定第一页。
- 无可预览原型文件时显示提示，不进行错误跳转。

### 3.3 后端权限模型决策

正式研发必须采用以下分层权限：

```text
team_members
→ 是否属于团队、是否可上传

project_permissions
→ 是否可查看/编辑项目
→ 决定项目列表与 Viewer ProjectSwitcher

file_permissions
→ 是否可查看/评论/编辑/删除具体文件
→ 不继承项目权限
```

---

## 四、实际研发计划与 Sprint 0 / Sprint 1

### 4.1 研发计划

已输出完整 V1 研发计划：

```text
HTML prototype/docs/HyperDesign-V1实际研发计划_2026-07-15.md
```

规划为：

| Sprint | 目标 | 状态 |
|---|---|---|
| 0 | 工程初始化、ZIP / Axure / Preview Spike | ✅ 首轮完成 |
| 1 | 注册、登录、会话与前端 Auth 联调 | ✅ 首轮完成 |
| 2 | 团队、成员、项目、项目级权限 | ⏳ 待开始 |
| 3 | 文件夹、ZIP 正式上传、异步解析、页面目录 | ⏳ 待开始 |
| 4 | 文件权限、受控预览、Viewer 真实数据 | ⏳ 待开始 |
| 5 | 评论、回复、分享链接 | ⏳ 待开始 |
| 6 | E2E、安全、部署、UAT | ⏳ 待开始 |

### 4.2 后端骨架

新建：

```text
HTML prototype/backend/
```

已落地：

- NestJS + TypeScript + Prisma。
- SQLite 本地开发数据库。
- Prisma Schema、Seed、操作日志基础模型。
- `GET /api/health` 健康检查。
- `.env.example`。
- `infra/docker-compose.yml`：PostgreSQL 16、Redis 7、MinIO 预留。

### 4.3 Auth API 与前端联调

已实现：

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/reset-password
POST /api/auth/change-password
```

安全实现：

- `argon2` 密码哈希。
- 服务端 Session 记录。
- 浏览器以 HttpOnly Cookie `hd_sid` 持有会话标识。
- Cookie 会话有效期 7 天。

前端已完成：

- Axios `withCredentials`。
- Vite `/api` 开发代理。
- 登录、注册、忘记密码调用真实 API。
- `AuthBootstrap` 通过 `/auth/me` 恢复会话。
- `RequireAuth` 保护业务路由。
- Topbar、个人设置读取真实当前用户。
- 修改密码、退出登录接真实 API。

开发账号：

```text
admin / Demo123456
chrisj / Demo123456
```

---

## 五、真实 Axure ZIP 验证

### 5.1 验证样例

```text
C:\Users\Chris J\Documents\产品文档\HSB2B-小程序-演示版本.zip
```

- 文件大小：约 1.38 MB。
- ZIP 条目：280。
- 标准 Axure HTML 导出结构：`data/`、`files/`、`images/`、`resources/`、`plugins/`。

### 5.2 已完成的 Spike 能力

- 有效 ZIP 签名与 `.zip` 后缀校验。
- 100MB 上传限制。
- Zip Slip / 路径穿越拦截。
- 安全解压与递归 HTML 扫描。
- HTML Title 提取和数字实体解码。
- 根目录 `index.html` 优先入口识别。
- 受控预览资源读取。

### 5.3 本次发现并修复

| 问题 | 处理结果 |
|---|---|
| ZIP 外层仅有一个包装目录 | 自动扁平化，入口正确为 `index.html` |
| Axure `resources/**` 与 `start*.html` 被误识别为页面 | 已过滤辅助页面 |
| 中文目录经过 URL 编码后资源无法读取 | 先 URL 解码，再执行路径安全校验 |
| 缺失资源导致内部 500 | 改为标准 `404 / NOT_FOUND` |

### 5.4 验证结果

```text
解析状态：success
可预览页面数量：6
入口页面：index.html
```

已验证读取：

```text
index.html
data/document.js
files/小程序欢迎页/data.js
images/小程序欢迎页/u100.png
```

安全验证：

```text
../.env 路径遍历 → 400
不存在资源 → 404
```

> Axure 页面导航、动态面板、运行时脚本及 Inspector 共存仍需在 Sprint 4 将 Viewer 接入真实 Preview API 后，进行浏览器 E2E 验证。

---

## 六、验证结果

```text
backend:  npm run build   ✅
frontend: npm run build   ✅
API Smoke Test            ✅
Axure ZIP 上传/解析/资源服务 ✅
```

API Smoke 覆盖：

```text
健康检查
→ 登录
→ 获取当前用户
→ 上传 ZIP
→ 识别页面与入口
→ 读取受控 HTML / CSS / JS / 图片资源
→ 拦截路径遍历
```

---

## 七、当前阻塞与风险

### 环境阻塞

本机未安装：

```text
Docker
PostgreSQL
Redis
```

当前用 SQLite 保持研发可运行；在 Sprint 2 前需安装 Docker Desktop 或提供 PostgreSQL / Redis 实例，随后切换：

```text
Prisma datasource → PostgreSQL
Session 存储 → Redis
ZIP 正式解析 → BullMQ 异步队列
```

### 技术风险

1. Axure 真实动态交互尚未在 Viewer iframe 中验证。
2. 原始 Axure ZIP 缺失两份 handoff 插件 CSS；当前返回 404，需确认对主画面是否无影响。
3. 当前 ZIP 接口是 Spike 路由，仅按上传者校验；尚未绑定团队、项目、文件夹与正式文件权限。
4. 评论、标注仍是前端临时状态，未持久化。

---

## 八、明日 / 下一步开发任务

### 优先级 P0：Sprint 2

1. 切换或准备 PostgreSQL、Redis 运行环境。
2. 实现 `teams`、`team_members`、`projects`、`project_permissions` 表与 migration。
3. 实现团队、成员、项目 CRUD API。
4. 实现当前用户可访问项目接口，替换团队页、项目页和 Viewer ProjectSwitcher mock。
5. 完成项目访问与编辑权限的 API 级自动化测试。

### 随后推进

```text
Sprint 3：正式 ZIP 上传 + BullMQ 异步解析 + 页面目录
Sprint 4：file_permissions + 真实 Viewer Preview API + Axure 浏览器 E2E
Sprint 5：评论、回复、分享链接持久化
Sprint 6：安全、部署、UAT
```

---

## 九、相关文档

- `docs/HyperDesign-V1实际研发计划_2026-07-15.md`
- `docs/HyperDesign-Sprint0-Sprint1启动记录_2026-07-15.md`
- `docs/HyperDesign-Axure-ZIP-Spike验证_2026-07-15.md`
- `docs/HyperDesign-ViewerProjectSwitcher_2026-07-15.md`
- `docs/HyperDesign-Viewer实时标注修复_2026-07-15.md`
- `docs/HyperDesign-今日进度汇总_2026-07-15.md`
