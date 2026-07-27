# HyperDesign 阶段 2：业务页内容还原

> 日期：2026-07-15  
> 状态：✅ 完成（Auth / 首页 / 团队详情 / 项目详情 / 设置）  
> Viewer 细节对齐：⏳ 保留现有能力，未做深度视觉精修  
> 验证：`npm run build` 通过

---

## 1. 本阶段目标

在阶段 1 的 Layout 壳之上，按 `prototype/*.html` 还原业务页**内容结构与信息层级**：

1. Auth 三页
2. 我的团队首页工作台
3. 团队详情
4. 项目详情资产工作台
5. 个人设置

---

## 2. 完成清单

### Auth
- 登录：Tab、邮箱密码、社交登录区、演示提示
- 注册：姓名/邮箱/密码强度/协议/成功态
- 忘记密码：三步流程（验证邮箱 → 设新密码 → 完成）

### 我的团队首页
- workspace meta
- Hero 文案与操作
- 4 张 Summary 指标卡
- 团队卡片网格（角色 pill + 三指标）
- 右侧活动流

### 团队详情
- Hero + meta pills + 操作
- 4 指标卡
- Segment Tabs：项目 / 成员
- 项目卡片 / 成员列表

### 项目详情
- 项目工作台 Hero
- 原型资产列表（筛选 / 搜索 / 状态标签）
- ZIP 上传区 + Modal
- 无详情 mock 的项目自动兜底生成资产

### 个人设置
- 个人资料 / 安全设置 / 登录管理 / 危险操作
- 右侧账号概览

---

## 3. 关键文件

- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/RegisterPage.tsx`
- `src/pages/auth/ForgotPasswordPage.tsx`
- `src/pages/teams/TeamsPage.tsx`
- `src/pages/teams/TeamDetailPage.tsx`
- `src/pages/projects/ProjectDetailPage.tsx`
- `src/pages/settings/UserSettingsPage.tsx`
- `src/store/mockData.ts`
- `src/styles/shell.css`
- `src/components/navigation/NavTree.tsx`（使用 team.color）

---

## 4. 验证

```bash
cd "HTML prototype/frontend"
npm run build
```

结果：TypeScript + Vite 构建通过。

---

## 5. 下一步（阶段 3 建议）

1. Viewer 细节对齐（顶栏 / 左右栏 / 状态色）
2. 项目详情侧栏 ProjectSwitcher
3. 创建团队 / 上传 ZIP 接真实后端
4. 路由鉴权与登录态持久化
5. 响应式与空状态补齐

开工口令：`开始阶段 3` 或 `继续 Viewer 细节`
