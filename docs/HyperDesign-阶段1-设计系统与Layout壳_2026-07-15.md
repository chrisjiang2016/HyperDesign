# HyperDesign 阶段 1：设计系统 + Layout 壳

> 日期：2026-07-15  
> 状态：✅ 完成  
> 工程：`HTML prototype/frontend`  
> 验证：`npm run build` 通过

---

## 1. 本阶段目标

把新版蓝系 SaaS 工作台壳落地到现有 React 工程：

1. 设计 token / Ant Design 主题  
2. Auth / AppShell / Viewer 三套 Layout  
3. Topbar + NavTree + RightPanel  
4. 业务页接入新壳  
5. 清理旧紫渐变主视觉  

---

## 2. 新增 / 修改文件

### 新增
- `src/theme/tokens.css`
- `src/theme/antdTheme.ts`
- `src/store/workspaceStore.ts`
- `src/components/navigation/Topbar.tsx`
- `src/components/navigation/NavTree.tsx`
- `src/components/workspace/RightPanel.tsx`
- `src/styles/shell.css`

### 重写 / 调整
- `src/App.tsx`：接入 `hyperDesignTheme`
- `src/main.tsx`：加载 tokens + shell 样式
- `src/layouts/AppLayouts.tsx`：
  - `AuthLayout`
  - `AppShellLayout`
  - `ViewerShellLayout`
  - `MainLayout` 兼容别名
- `src/components/common/PageBreadcrumb.tsx`
- `src/pages/auth/*` 品牌文案改为 HyperDesign
- `src/pages/teams/*`、`projects/ProjectDetailPage.tsx`、`settings/UserSettingsPage.tsx` 接入 AppShell
- `src/pages/projects/PrototypeViewerPage.tsx` 接入 ViewerShell
- `src/styles/global.css` 主色替换为蓝系

---

## 3. 设计系统结果

### Token
- 主色：`#2563eb`
- 背景：`#f8fafc`
- 边框：`#eaecf0`
- 圆角：8 / 10 / 12 / 16
- Topbar：64px
- Sidebar：232px
- Rightbar：304px

### Ant Design
`ConfigProvider` 已映射到同一套蓝系 token，按钮/输入/卡片圆角与原型对齐。

---

## 4. Layout 结果

### AuthLayout
- 浅灰居中白卡
- 去掉全屏紫渐变背景

### AppShellLayout
- Topbar + 左树 + 主内容 + 右栏
- 业务页统一使用
- 侧栏 NavTree 支持展开折叠（localStorage 持久化）

### ViewerShellLayout
- 独立全幅评审壳
- 顶部工具条 + 左页面树 + 中画布 + 右评论
- 保留原 inspect / comment / normal 逻辑

---

## 5. 验证

```bash
npm run build
```

结果：
- TypeScript 编译通过
- Vite 构建通过
- 仅有 chunk 体积告警（历史问题，不阻塞）

---

## 6. 当前状态

### 已完成
- 新壳可见
- 新主题可见
- 主链路页面已挂到新壳
- Viewer 能力未推倒，只换壳

### 未完成（下一阶段）
- 各业务页内容区仍偏旧 Ant Design 卡片样式
- 首页还不是新版 Hero + Summary + 团队工作台完整还原
- 项目详情资产工作台未按新原型重做
- Viewer 内部细节样式还可继续贴近新原型

---

## 7. 下一步（阶段 2）

建议顺序：

1. Auth 三页视觉精细还原  
2. 我的团队首页工作台还原  
3. 团队详情  
4. 项目详情  
5. 个人设置  
6. Viewer 细节对齐  

开工口令：`开始阶段 2`
