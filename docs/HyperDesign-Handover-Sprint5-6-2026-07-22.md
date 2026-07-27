# HyperDesign Handover Brief（Sprint 5–6 补齐开工单）

> 生成时间：2026-07-22 16:22 GMT+8  
> 用途：旧会话 context overflow 卡死后，给 **新会话** 直接开工，避免全量重盘点  
> 工作区：`C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype`

---

## 0. 一句话现状

**主干已恢复、可编译；Sprint 0–4 大体可用；Sprint 5 后端在、前端不完整；Sprint 6C 收尾基本未完成。**  
旧会话已因 context overflow + session takeover 失败，**不要继续用旧会话聊天记录**。

---

## 1. 项目路径

| 项 | 路径 |
|---|---|
| 前端 | `frontend/` |
| 后端 | `backend/` |
| 文档 | `docs/` |
| E2E | `frontend/e2e/`（5 个 spec） |
| 部署目录 | `infra/`（此前为空或仅部分草稿） |
| Agent workspace | `C:\Users\Chris J\.openclaw\workspace-fullstack-dev` |

### 本地环境（已核实）
- backend `.env`：`DATABASE_URL="file:./dev.db"`（SQLite），`PORT` 注意与前端代理对齐
- frontend Vite 代理默认：`VITE_API_TARGET ?? 'http://localhost:3001'`
- 实测后端常跑在 **3001**（若 `.env` 是 3000 需统一）
- seed：`admin/Demo123456`，`chrisj/Demo123456`（另有 mia001、leo001，密码相同）

---

## 2. 已完成 / 已恢复（不要重做）

### Sprint 0–4（视为已恢复主线）
- 后端：Auth / Prisma / Uploads / Zip 解析 / 受控预览 / 权限服务
- 前端：`src` 已恢复约 **31 个文件**，不是空壳
- 关键入口存在：
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/router/index.tsx`
  - `frontend/src/pages/auth/*`
  - `frontend/src/pages/teams/*`
  - `frontend/src/pages/projects/ProjectDetailPage.tsx`
  - `frontend/src/pages/projects/PrototypeViewerPage.tsx`
  - `frontend/src/api/auth.ts` / `workspace.ts`
- 前端 **`npm run build` 已通过**（恢复后实测）
- 后端 collaboration / shares 模块代码在：
  - `backend/src/collaboration/*`
  - `backend/src/shares/*`
  - `backend/src/app.module.ts` 已 import 这两个模块

### 不要再做的事
- ❌ 不要再扫描 trajectory 考古恢复 src（主体已恢复）
- ❌ 不要全量重写 frontend/src
- ❌ 不要从 Sprint 0 重新做
- ❌ 不要在一轮里把前后端+E2E+docs 全读完再动手（会再次 overflow）

---

## 3. 真实缺口（按优先级）

### P0-A：Viewer 评论 / 标注前端持久化（Sprint 5）
**现状**
- 后端 collaboration API 存在（list/create annotation、comment、reply、resolve、delete）
- 前端 `PrototypeViewerPage` 仍大量本地临时态 / mock 倾向
- `frontend/src/store/viewerMockData.ts` 仍在

**目标**
- Viewer 创建标注/评论/回复 → 调真实 API
- 刷新页面后数据仍在
- 权限：无 `canComment` 时前端拦截 + 后端 403

**关键文件（优先读这些）**
- `frontend/src/pages/projects/PrototypeViewerPage.tsx`
- `frontend/src/api/workspace.ts`（或新增 `api/collaboration.ts`）
- `backend/src/collaboration/collaboration.controller.ts`
- `backend/src/collaboration/collaboration.service.ts`
- `frontend/e2e/04-inspect-comment.spec.ts`

### P0-B：分享链接前端闭环（Sprint 5 / 6A）
**现状**
- 后端 shares：create/list/revoke/inspect/accept 已存在
- 前端分享按钮偏演示态
- 缺完整：创建 → 复制 token URL → `/share/:token` 接受 → 只读预览 → 撤销后失效

**目标**
- 文件管理者可创建 1–30 天分享链接（默认 7）
- 列表显示状态/到期/接受次数
- 可撤销；token 仅创建时返回一次
- 外部用户：未登录跳登录 → 登录后回分享页 → accept → Viewer 只读

**关键文件**
- `backend/src/shares/shares.controller.ts`
- `backend/src/shares/shares.service.ts`
- `frontend/src/pages/projects/ProjectDetailPage.tsx`（分享入口）
- `frontend/src/pages/projects/PrototypeViewerPage.tsx`
- 可能需新增：`frontend/src/pages/share/ShareAcceptPage.tsx` + 路由
- `frontend/e2e/05-share-link.spec.ts`
- 参考文档：`docs/HyperDesign-Sprint6A-完成记录_2026-07-20.md`

### P0-C：E2E 与当前 DOM 对齐（Sprint 6C 第一步）
**现状**
- `frontend/e2e/` 5 个文件、约 21 用例已写
- 大量 `data-testid` / 选择器与当前页面不一致
- 未验证真实全绿

**目标**
- 给关键节点补 `data-testid` **或** 改 E2E 用当前 role/label 选择器
- 先保证 auth / team-project / upload-preview / comment / share 主路径可跑

**关键文件**
- `frontend/e2e/01-auth.spec.ts`
- `frontend/e2e/02-team-project-permission.spec.ts`
- `frontend/e2e/03-upload-parse-preview.spec.ts`
- `frontend/e2e/04-inspect-comment.spec.ts`
- `frontend/e2e/05-share-link.spec.ts`
- `frontend/e2e/helpers.ts`
- `frontend/playwright.config.ts`

### P1：部署 / Docker（Sprint 6C）
- `infra/` 正式 Dockerfile / compose / env 示例未完整落地
- 本地现仍以 SQLite 开发为主；部署目标是 Postgres + Redis + MinIO（有草稿/记忆，未完成）

### P2：前端收尾
- 响应式、空态、loading 统一、lint warning、bundle

---

## 4. 新会话工作策略（必须遵守，防再次卡死）

1. **一次只做一个 P0 切片**，不要并行全读。
2. 每切片流程：读相关 ≤8 个文件 → 改代码 → `build`/`lint` 验证 → 简短汇报 → 再下一块。
3. **禁止** 一轮 `read` 全仓库 + 全部 E2E + 全部 docs。
4. 大文件用局部读 / 搜索，不要整文件反复读入会话。
5. 写完一块就更新本 handover 或 `memory/YYYY-MM-DD.md`，别把进度只留在聊天里。

---

## 5. 建议执行顺序（新会话直接照做）

### Step 1 — 评论持久化
- 加前端 collaboration API client
- 改 `PrototypeViewerPage` 接真实 annotations/comments
- 去掉/隔离 mock 路径
- `frontend` build 通过

### Step 2 — 分享闭环
- 加 shares API client + 分享 UI + `/share/:token` 页
- 接 create/list/revoke/accept/inspect
- build 通过

### Step 3 — E2E 对齐
- 修 helpers 登录契约（用户名不是邮箱）
- 对齐选择器 / testid
- 跑 `npm run test:e2e`（先单文件，再全量）

### Step 4 — Docker / 部署
- 补 `infra/docker-compose.yml`、backend/frontend Dockerfile、`.env.example`
- 文档写清启动步骤

---

## 6. 验收标准（最小可交付）

- [ ] Viewer 评论/标注刷新后仍在（真实 API）
- [ ] 分享链接 create → accept → 只读预览 → revoke 失效
- [ ] E2E 主路径不再因缺失 testid 大面积失败
- [ ] 前后端 build 通过
- [ ] （可选）compose 能起基础服务

---

## 7. 旧会话失败原因（供排查，勿重复）

1. **Context overflow**：tool loop 中 estimated context 超安全阈值（约 200k）
2. **Session takeover**：同一 session 并发写入导致 `EmbeddedAttemptSessionTakeoverError`
3. 症状：`The agent run failed before producing a reply.`

处理：用本文件在 **新会话** 开工，不要继续塞旧 transcript。

---

## 8. 新会话建议第一条用户指令（复制即用）

```text
按 docs/HyperDesign-Handover-Sprint5-6-2026-07-22.md 开工。
不要全量重盘点，不要重读整仓。
第一刀只做 P0-A：Viewer 评论/标注前端真实 API 持久化。
读完相关文件就改代码，改完 frontend build，再汇报。
```

---

## 9. 证据来源（本 brief 依据）

- `memory/2026-07-22.md`（src 丢失事故与 Sprint 基线）
- `memory/2026-07-22-1511.md`（恢复体检与差异结论）
- 会话日志：context overflow / session takeover（2026-07-22 15:17–15:21）
- 文件系统：`frontend/src` 约 31 文件；collaboration/shares 目录存在
