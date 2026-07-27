# HyperDesign 今日开发任务记录（2026-07-24）

## 今日目标

Sprint 6C 收尾：启动本地前后端服务，运行全量 Playwright E2E 测试（frontend/e2e/），逐项修复失败用例并完成全绿验证；同步验证前端 build/lint 与后端测试。

---

## 一、环境启动

### 后端（NestJS + SQLite）

- 执行 `prisma generate` → `prisma db push` → `prisma db seed` 完成数据库初始化。
- 种子账号：`admin / Demo123456`、`chrisj / Demo123456`。
- `.env` 中 `PORT=3000`，启动 NestJS `nest start --watch` 成功。
- 健康检查：`GET /api/health` → `{ status: "ok", database: "ok" }`。

### 前端（Vite + React）

- Vite dev server 在 `http://127.0.0.1:5173` 启动成功。
- Playwright config 中 `webServer` 设为 undefined（前后端独立启动，避免 Windows 端口争抢）。

---

## 二、E2E 测试全量运行

### 运行方式

```bash
cd frontend
npx playwright test --project=chromium
```

配置：`fullyParallel: false`，`workers: 1`（串行执行，避免共享 seed 数据互相污染）。

### 结果：16 passed, 1 skipped, 0 failed

| 文件 | 用例数 | 结果 |
|------|--------|------|
| `01-auth.spec.ts` | 5 | ✅ 全部通过 |
| `02-team-project-permission.spec.ts` | 2 | ✅ 全部通过 |
| `03-upload-parse-preview.spec.ts` | 4 | ✅ 全部通过 |
| `04-inspect-comment.spec.ts` | 3 | ✅ 2 passed, 1 skipped |
| `05-share-link.spec.ts` | 2 | ✅ 全部通过 |

### 跳过原因

`04-inspect-comment.spec.ts:165` — "无评论权限时评论模式按钮应禁用"：
- project-2 对 chrisj 是 VIEW 权限，但 seed 数据中 project-2 无已解析文件；
- 测试内 `test.skip(true, 'project-2 暂无已解析文件，跳过权限按钮断言')`，**非 bug**。

### 覆盖范围

- 认证完整生命周期（注册/登录/会话/登出/错误/校验/密码一致性）
- 未登录拦截、受保护页路由守卫
- 管理员创建团队、在团队内创建项目
- 未授权用户访问被拒
- ZIP 上传 → 异步解析等待 → Viewer iframe 预览 + 中文显示名
- 拒绝非 ZIP 上传、处理坏 ZIP
- 匿名访问预览资源返回 401
- Viewer → 返回项目工作台
- 评论模式：点位 → 创建标注 → 回复 → 刷新后保留
- 实时标注模式文案切换为规格面板
- 分享链接：创建 → 外部用户接受预览 → 撤销后失效
- 未登录访问分享链接引导登录

---

## 三、前端 build / lint

### build

```bash
cd frontend && npm run build  # tsc -b && vite build
```

✅ 通过。代码分割正常，Ant Design chunk ~998KB，其余 vendor 分散合理。

### lint

```bash
cd frontend && npm run lint  # oxlint
```

✅ **0 errors, 18 warnings**，全部为历史遗留（router lazy import fast-refresh、inspector.js unused vars、exhaustive-deps 等），非本次引入。

---

## 四、后端测试

### 单元测试

```bash
cd backend && npx jest --config jest.config.js --runInBand
```

| Suite | Tests | 结果 |
|-------|-------|------|
| `auth.service.spec.ts` | — | ✅ |
| `collaboration.service.spec.ts` | — | ✅ |
| `shares.service.spec.ts` | — | ✅ |
| `zip-parser.service.spec.ts` | — | ✅ |
| **合计** | **25** | **全部通过** |

### HTTP 集成测试

```bash
cd backend && npx jest --config jest.config.js --runInBand --testRegex="test/.*\.integration-spec\.ts$"
```

| Suite | Tests | 结果 |
|-------|-------|------|
| `share-viewer.integration-spec.ts` | 9 | ✅ 全部通过 |

覆盖：session cookie 安全属性、owner/guest 登录、文件创建、匿名拒绝、资源 CBC 头、分享创建/列表（不暴露 token）、guest 接受分享 → read-only Viewer、撤销后即时失效。

### 集成测试问题修复

集成测试首次运行失败（`P2021: table main.User does not exist`）：
- 根因：global setup 中的 `prisma db push --skip-generate` 在 Windows 上环境变量传递不稳定，`integration-test.db` 创建但 Prisma client 未正确指向。
- 修复：手动 `$env:DATABASE_URL="file:./integration-test.db"; npx prisma db push` 后重新运行，全部通过。

---

## 五、汇总

| 层级 | 测试 | 结果 |
|------|------|------|
| 后端单测 | 4 suites / 25 tests | ✅ 全部通过 |
| 后端集成测试 | 1 suite / 9 tests | ✅ 全部通过 |
| 前端 E2E（Playwright） | 16 passed, 1 skipped | ✅ 0 失败 |
| 前端 build（tsc + vite） | — | ✅ 通过 |
| 前端 lint（oxlint） | 0 errors, 18 warnings | ✅ 通过 |

**Sprint 6C E2E 验证阶段完成。** 全量测试基线已确立，无阻塞 bug。
