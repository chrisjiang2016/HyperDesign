# HyperDesign Sprint 6B-2 完成记录：HTTP 集成测试基线

> 完成日期：2026-07-21  
> 状态：完成

## 目标

为 Sprint 6A 的 `file_only` 安全分享建立 HTTP 级自动化测试，验证实际 NestJS 路由、中间件、Cookie 会话与 Prisma 数据库之间的安全边界，而不只停留在 Service mock 单测。

## 新增测试基础设施

- `backend/jest.integration.config.js`
  - 仅发现 `*.integration-spec.ts`；
  - 配置 30 秒测试超时；
  - 集成测试与既有单测独立运行。
- `backend/test/integration.global-setup.ts`
  - 每次集成测试前创建独立 SQLite 数据库 `prisma/integration-test.db`；
  - 通过 Prisma Schema 同步数据库，避免污染本地 `dev.db`。
- `backend/test/integration.global-teardown.ts`
  - 测试结束后删除临时数据库。
- 新增脚本：`npm run test:integration`。

## 覆盖的 HTTP 用例

`backend/test/share-viewer.integration-spec.ts` 共 6 项：

1. Viewer 页面目录 API 未携带会话 Cookie 时返回 `401`；
2. 用户注册、登录和 `hd_sid` HttpOnly Cookie 会话真实建立；
3. 未接受分享的外部用户不能读取目标文件页面目录；
4. 文件上传者通过 Cookie 创建分享链接，且列表 API 不泄露原始 token；
5. 外部用户接受链接后可访问 Viewer，权限固定为只读：
   `canView=true`，`canComment/canEdit/canDelete=false`；
6. 撤销链接后：公开检查、再次接受与既有 Viewer 访问均立即失效；同时验证不会产生外部用户的永久 `FilePermission`。

## 验证结果

- 后端构建：`npm run build` ✅
- 后端单元测试：3 suites / 18 tests ✅
- 后端 HTTP 集成测试：1 suite / 6 tests ✅
- 前端生产构建：`npm run build` ✅
- 前端 lint：0 errors，5 个既有 warnings
- 后端 lint：0 errors，3 个既有 warnings

## 说明

当前 HTTP 集成测试使用独立 SQLite 数据库，适合作为本地与 CI 的快速安全回归基线。后续若切换 PostgreSQL，需要在 Release/DevOps Sprint 中补充 PostgreSQL 容器化集成测试与浏览器级 E2E。
