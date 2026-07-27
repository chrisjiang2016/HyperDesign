# HyperDesign 阶段 0：设计对齐与前端实施方案

> 日期：2026-07-15  
> 状态：✅ 阶段 0 完成（待确认后进入阶段 1 编码）  
> 原型来源：`HTML prototype/prototype/`  
> 前端工程：`HTML prototype/frontend/`  
> 策略：**方案 A — 在现有 React 工程上按新原型整体迁移 UI，保留 Viewer 核心能力**

---

## 1. 阶段 0 目标与结论

### 1.1 目标
1. 以新版 HTML 原型为准，冻结视觉规范与信息架构  
2. 明确现有 React 工程与新原型的差异边界  
3. 产出可直接编码的前端实施方案  
4. 修正过时文档中的配色描述  

### 1.2 结论
| 项 | 结论 |
|----|------|
| 是否小改皮肤 | ❌ 否，是完整产品壳重设计 |
| 是否推倒重写前端 | ❌ 否，保留工程与 Viewer 能力 |
| 视觉基准 | ✅ 以 `prototype/*.html` 为准，不以旧 README 紫渐变为准 |
| 主色 | `#2563eb`（蓝系 SaaS） |
| 布局核心 | Topbar + 左树 + 主内容 + 右栏 |
| Viewer | 保留真实 iframe / inspect / comment / normal |

---

## 2. 冻结设计规范（Design Tokens）

### 2.1 颜色

```css
:root {
  /* 背景 */
  --bg-page: #f8fafc;
  --bg-surface: #ffffff;
  --bg-muted: #f6f8fb;
  --bg-soft: #fafcff;

  /* 文本 */
  --text-primary: #111827;
  --text-secondary: #475467;
  --text-tertiary: #98a2b3;

  /* 边框 */
  --border-light: #eaecf0;
  --border-soft: #eef2f6;

  /* 品牌 */
  --brand: #2563eb;
  --brand-hover: #1d4ed8;
  --brand-soft: #eff6ff;
  --brand-ring: rgba(37, 99, 235, 0.08);

  /* 状态 */
  --success: #027a48;
  --success-soft: #ecfdf3;
  --warning: #c2410c;
  --warning-soft: #fff7ed;
  --danger: #dc2626;
  --danger-soft: #fef2f2;

  /* 团队色（侧栏示意） */
  --team-indigo: #6366f1;
  --team-green: #10b981;
  --team-amber: #f59e0b;
}
```

### 2.2 圆角 / 阴影 / 间距 / 字号

| 类型 | Token | 值 |
|------|-------|----|
| 圆角小 | `--radius-sm` | `8px` |
| 圆角中 | `--radius-md` | `12px` |
| 圆角大 | `--radius-lg` | `16px` |
| 按钮/输入常用 | - | `10px` |
| 轻阴影 | `--shadow-sm` | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.08)` |
| 中阴影 | `--shadow-md` | `0 4px 12px rgba(16,24,40,.08), 0 8px 32px rgba(16,24,40,.12)` |
| 间距基准 | - | 4 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32 / 36 / 40 |
| 字号 | - | 12 / 13 / 14 / 15 / 16 / 18 / 24 / 28 / 30 |

### 2.3 布局尺寸

| 区域 | 尺寸 |
|------|------|
| Topbar 高度 | `64px` |
| Sidebar 宽（业务页） | `232px` |
| Sidebar 宽（Viewer） | `240px` |
| Rightbar 宽（首页） | `304px` |
| Rightbar 宽（团队/项目/设置） | `300px` |
| Rightbar 宽（Viewer） | `340px` |
| Auth 卡最大宽 | `440px` |
| 主内容左右 padding | `28px 32px`（小屏 `16px`） |

### 2.4 字体与动效

- 字体：`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
- 过渡：`0.18s ease`（少数 `0.22s`）
- 焦点环：`border-color: brand` + `box-shadow: 0 0 0 3px rgba(37,99,235,0.08)`

### 2.5 明确废弃（旧版）

| 旧值 | 处理 |
|------|------|
| `#667eea → #764ba2` 紫渐变主色 | 废弃 |
| 全屏紫渐变 Auth 背景 | 废弃，改为浅灰居中白卡 |
| 仅 Header + Content 的 MainLayout | 废弃，改为三栏 AppShell |
| Emoji 大图标团队卡为主视觉 | 降级，信息层级以工作台指标 + 卡片文案为主 |

---

## 3. 页面清单与信息架构

### 3.1 页面映射

| 原型文件 | 路由（建议） | 布局 | 优先级 |
|----------|--------------|------|--------|
| `demo.html` | `/demo`（可选） | 展示页 | P2 |
| `login.html` | `/login` | AuthLayout | P0 |
| `register.html` | `/register` | AuthLayout | P0 |
| `forgot-password.html` | `/forgot-password` | AuthLayout | P0 |
| `index.html` | `/` | AppShell | P0 |
| `team-detail.html` | `/teams/:teamId` | AppShell | P0 |
| `project-detail.html` | `/projects/:projectId` | AppShell | P0 |
| `prototype-viewer.html` | `/files/:fileId/preview` | ViewerShell | P0 |
| `user-settings.html` | `/settings` | AppShell | P1 |

### 3.2 页面跳转

```text
login
  ├─ register
  ├─ forgot-password
  └─ index（我的团队工作台）
       ├─ team-detail
       │    └─ project-detail
       │         └─ prototype-viewer
       └─ user-settings → login（退出）
```

### 3.3 AppShell 结构（业务页统一）

```text
AppShell
├── Topbar
│   ├── Brand
│   ├── Breadcrumb
│   ├── SearchInline
│   ├── NotifyIcon
│   └── UserEntry
└── Workspace
    ├── Sidebar
    │   ├── NavTree（团队 → 项目）
    │   ├── 常用 / 收藏
    │   └── 页面特有：ProjectSwitcher / 项目内导航
    ├── Main
    │   ├── Hero / Header
    │   ├── SummaryCards
    │   └── SectionPanel（列表/资产/表单）
    └── Rightbar
        ├── 最近活动
        ├── 协作摘要
        └── 页面特有说明
```

### 3.4 ViewerShell 结构

```text
ViewerShell
├── Topbar（返回 / 标题 / 模式切换 / 分享）
└── Workspace（可折叠左右栏）
    ├── Left: 页面树
    ├── Center: 缩放 + 设备切换 + iframe 画布 + marker 层
    └── Right: 评论列表 / Inspect 面板 / 输入框
```

---

## 4. 组件拆分清单

### 4.1 布局层
- `AuthLayout`
- `AppShellLayout`
- `ViewerShellLayout`
- `Topbar`
- `WorkspaceSidebar`
- `RightPanel`
- `PageBreadcrumb`

### 4.2 导航与通用
- `BrandMark`
- `SearchInline`
- `UserEntry`
- `NavTree` / `NavTreeGroup` / `NavTreeItem`
- `StatusPill`
- `MetaPill`
- `SegmentTabs`
- `EmptyState`
- `ModalShell`（可继续用 antd Modal，样式对齐）

### 4.3 业务块
- `HeroPanel`
- `SummaryGrid` / `SummaryCard`
- `TeamCard` / `TeamGrid`
- `ProjectCard` / `ProjectGrid`
- `MemberList`
- `ActivityFeed` / `ActivityItem`
- `ProjectSwitcher`
- `AssetToolbar`
- `AssetRow` / `AssetList`
- `UploadZipModal`
- `SettingsProfileCard`
- `ChangePasswordForm`
- `DangerZone`

### 4.4 Viewer（保留增强）
- `PrototypeViewerPage`（现有逻辑为主）
- `ViewerToolbar`
- `ViewerPageTree`
- `ViewerCanvas`
- `ViewerCommentPanel`
- `ViewerInspectPanel`
- 保留：`inspector.js` + postMessage 协议 + annotation payload

---

## 5. 现有 React 工程差异与迁移边界

### 5.1 现有技术栈（保持）
- React 19 + TypeScript + Vite
- Ant Design 6
- Zustand
- React Query
- React Router 7

### 5.2 现状问题
1. `AuthLayout` 仍是紫渐变全屏  
2. `MainLayout` 只有 Header + Content，无左树/右栏  
3. 页面视觉仍是旧版 Ant Design 卡片风格  
4. 全局 CSS 主色仍是 `#667eea`  
5. Mock 数据结构偏旧，未表达“工作台指标 / 活动流 / 资产状态”  

### 5.3 必须保留
1. 路由页面骨架与工程配置  
2. `PrototypeViewerPage` 真实预览能力  
3. inspect / comment / normal 三模式  
4. 评论 `pageId` 隔离与 annotation payload  
5. `public/prototype-assets` 与 `inspector.js`

### 5.4 必须重做
1. 设计 token 与主题  
2. Layout 壳  
3. 业务页布局与信息层级  
4. 侧栏 NavTree 与上下文高亮  
5. 首页 / 团队 / 项目 工作台内容结构  

### 5.5 Ant Design 使用策略
- **继续用 antd**：Form / Modal / Input / message / Upload 基础能力  
- **弱化 antd 默认皮肤**：通过 ConfigProvider token + 自定义 CSS 对齐新原型  
- **复杂工作台区块**：优先自定义组件，不硬套 antd Card/Statistic 默认样式  

建议 ConfigProvider 主色：

```ts
theme: {
  token: {
    colorPrimary: '#2563eb',
    colorSuccess: '#027a48',
    colorWarning: '#c2410c',
    colorError: '#dc2626',
    colorText: '#111827',
    colorTextSecondary: '#475467',
    colorBorder: '#eaecf0',
    colorBgLayout: '#f8fafc',
    borderRadius: 10,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
  },
}
```

---

## 6. 目标目录结构（阶段 1 起落地）

```text
frontend/src/
├── app/
│   └── providers.tsx                 # QueryClient + ConfigProvider + Router
├── theme/
│   ├── tokens.css                    # CSS variables
│   └── antdTheme.ts                  # antd token 映射
├── layouts/
│   ├── AuthLayout.tsx
│   ├── AppShellLayout.tsx
│   └── ViewerShellLayout.tsx
├── components/
│   ├── common/                       # Brand / Search / Pill / Tabs ...
│   ├── navigation/                   # Topbar / NavTree / Breadcrumb
│   ├── workspace/                    # Hero / Summary / Activity / Asset ...
│   └── viewer/                       # Viewer 子组件（逐步拆）
├── pages/
│   ├── auth/
│   ├── teams/
│   ├── projects/
│   └── settings/
├── store/
│   ├── authStore.ts
│   ├── workspaceStore.ts             # 当前团队/项目、侧栏折叠状态
│   ├── mockData.ts                   # 业务 mock
│   └── viewerMockData.ts             # 保留并扩展
├── api/
│   └── http.ts
├── router/
│   └── index.tsx
└── styles/
    └── global.css                    # 全局重置 + 壳样式
```

---

## 7. 状态管理与 Mock 数据边界

### 7.1 Store 职责
| Store | 职责 |
|-------|------|
| `authStore` | 登录态、用户信息 |
| `workspaceStore` | 当前 team/project、NavTree 展开态、rightbar 显隐 |
| `viewerMockData` / 后续 viewer store | 页面列表、marker、comment、模式 |

### 7.2 Mock 需要补齐的字段
- Team：`id, name, role, memberCount, projectCount, feedbackCount, color, description, updatedAt`
- Project：`id, teamId, name, description, fileCount, status, updatedAt`
- FileAsset：`id, projectId, title, pageCount, status(review/done), commentOpenCount, updatedAt`
- Activity：`id, type, title, summary, createdAt, link`
- Summary metrics：团队数 / 项目数 / 待评审 / 评论数

阶段 1~2 先 mock，接口形状尽量贴近已有 API 设计文档。

---

## 8. 分阶段实施计划

### 阶段 0（本次）✅
- 设计对齐
- 差异边界
- 实施方案
- README 配色修正

### 阶段 1：设计系统 + Layout 壳
交付：
1. `tokens.css` + antd theme  
2. `AuthLayout` / `AppShellLayout` / `ViewerShellLayout`  
3. `Topbar` + `NavTree` + `RightPanel`  
4. 路由壳切换  
验收：
- 任意业务页已是三栏壳
- 主色为蓝系，无紫渐变残留主视觉

### 阶段 2：Auth 三页
- 登录 / 注册 / 忘记密码  
- 表单校验规则对齐原型  
验收：视觉与交互接近原型，可本地跳转

### 阶段 3：工作台主流程
顺序：
1. 我的团队首页  
2. 团队详情  
3. 项目详情  
4. 个人设置  
验收：主链路可点通，mock 数据驱动

### 阶段 4：Viewer 壳对齐
- 外层 UI 对齐新原型  
- 内层保留 inspect/comment/normal  
验收：
- 真实 HTML 预览可用
- 标注/评论可用
- 左右栏可折叠

### 阶段 5：联调准备
- API 适配层
- 上传 ZIP
- 评论持久化接口对接

---

## 9. 阶段 1 编码任务拆解（确认后立即开工）

1. 新建 `src/theme/tokens.css`、`antdTheme.ts`  
2. 改 `main.tsx` / `App.tsx` 接入 ConfigProvider  
3. 重写 `layouts/*`  
4. 实现 `Topbar`、`NavTree`、`RightPanel`  
5. 用占位 Main 内容验证壳  
6. 同步改 `global.css` 去掉旧紫渐变主视觉  
7. `npm run build` 验证  

预计：阶段 1 完成后即可肉眼看到“新 HyperDesign 壳”。

---

## 10. 验收标准（阶段 0）

- [x] 主色、背景、边框、字号、圆角、布局尺寸已冻结  
- [x] 页面清单与路由映射已明确  
- [x] 组件拆分清单已明确  
- [x] 保留/重做边界已明确  
- [x] 分阶段实施顺序已明确  
- [x] README 过时配色已修正  

---

## 11. 风险与注意点

1. **README 与 HTML 不一致**：必须以 HTML 为准。  
2. **三栏壳在中小屏要降级**：`<1180px` 可隐藏右栏，`<860px` 可隐藏侧栏。  
3. **Viewer 不要重写核心逻辑**：只换壳，避免回归 inspect/comment。  
4. **Ant Design 默认样式容易“穿帮”**：统一走 token + 局部覆盖。  
5. **NavTree 状态**：展开/折叠建议 localStorage 持久化（原型已有类似行为）。

---

## 12. 下一步

用户确认后进入：

> **阶段 1：设计系统 + AppShell / AuthLayout / ViewerShell**

开工口令建议：`开始阶段 1`
