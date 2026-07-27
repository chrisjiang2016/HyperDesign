# HyperDesign ProjectSwitcher 调整记录

> 日期：2026-07-15  
> 状态：✅ 已调整  
> 依据：项目详情截图反馈

## 调整内容

移除了项目详情页左侧栏**顶部额外添加**的「当前项目」切换器卡片。

原因：左侧标准导航树中「我的团队 → 团队 → 项目」已经承担项目切换职责；顶部卡片与该区域重复，造成同一功能出现两处。

## 保留

- 左侧标准导航树中的项目入口与项目切换能力
- 当前路由对应项目的高亮状态

## 移除

- `AppShellLayout.sidebarExtra` 注入的顶部「当前项目」卡片
- 该卡片关联的下拉菜单状态、项目列表推导和专用 CSS

未新增任何原型外内容。

## 修改文件

- `frontend/src/pages/projects/ProjectDetailPage.tsx`
- `frontend/src/styles/shell.css`

## 验证

```bash
cd "HTML prototype/frontend"
npm run build
```

结果：TypeScript + Vite 构建通过。

最新构建：
- `dist/assets/index-BeGepXMh.css`
- `dist/assets/index-BaM1iS6F.js`
