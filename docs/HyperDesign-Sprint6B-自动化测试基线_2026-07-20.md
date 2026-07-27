# HyperDesign Sprint 6B-1 完成记录：自动化测试基线

> 完成日期：2026-07-20  
> 状态：完成（第一批核心服务单测）

## 本次范围

建立后端 Jest + ts-jest 自动化测试基础，并优先覆盖当前风险最高的认证、协作权限和安全分享服务。

## 测试基础设施

新增：

```text
backend/jest.config.js
backend/eslint.config.js
```

新增脚本：

```text
npm test
npm run test:coverage
npm run lint
```

## 新增测试

### AuthService：6 项

- 注册用户名确认不一致被拒绝；
- 注册写入 hash 后的密码并写审计日志；
- 不存在用户登录不泄露账号存在性；
- 禁用账号即使密码正确也被拒绝；
- 有效凭据签发会话 token；
- 过期会话被清理并拒绝访问。

### SharesService：6 项

- token 具备高熵且持久化层只保存 SHA-256 hash；
- 非上传者、非编辑者不能管理链接；
- 链接列表绝不暴露 token；
- 有效链接可被接受并建立 ShareGrant；
- 已撤销和已过期链接不可读取；
- 撤销写入审计日志。

### CollaborationService：6 项

- file_only 只读分享用户不能发表评论；
- 评论作者可编辑自己的评论；
- 无关用户不能删除他人评论；
- 文件编辑者可处理他人标注；
- 跨文件标注不能被删除。

## 验证结果

```text
npm test                 3 suites / 18 tests passed
npm run test:coverage    passed
npm run build            passed
npm run lint             0 error / 3 existing warnings
```

覆盖率（当前第一批核心测试）：

| 模块 | Statements | Lines |
|---|---:|---:|
| SharesService | 86.27% | 92.68% |
| AuthService | 62.50% | 62.74% |
| CollaborationService | 50.00% | 55.35% |
| 全后端（包含尚未纳入测试的 Workspace / ZIP 解析等模块） | 21.48% | 22.19% |

## 已知非阻塞项

- ESLint 已可运行，现存 3 个 warning：`current-user.service.ts` 的未使用变量，以及 `zip-parser.service.ts` 的两个历史写法警告；均非本次测试新增，未自动修改业务代码。
- 尚未引入浏览器级 E2E；下一批应覆盖 HTTP session、分享接受后的 Viewer 页面访问、撤销后的访问失效。
