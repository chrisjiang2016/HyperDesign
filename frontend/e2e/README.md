# HyperDesign E2E 测试文档

## 概述

本目录包含 HyperDesign 平台的端到端（E2E）自动化测试，使用 Playwright 框架。

## 测试用例列表

### ✅ 01-auth.spec.ts - 用户身份认证流程
- 注册 → 登录 → 会话恢复 → 登出
- 阻止未登录用户访问受保护页面
- 拒绝错误的登录凭据
- 验证注册表单必填项
- 验证密码确认一致性

### ✅ 02-team-project-permission.spec.ts - 团队、项目与权限管理
- 管理员创建团队
- 管理员创建项目
- 管理员添加成员到团队
- 管理员授予项目查看权限
- 普通成员只能看到被授权的项目
- ProjectSwitcher 只显示有权限的项目
- 阻止普通成员访问未授权项目

### ✅ 03-upload-parse-preview.spec.ts - 文件上传、解析与预览
- ZIP 上传 → 解析 → 页面目录 → iframe 预览
- 页面切换功能
- 设备模式切换（桌面/平板/移动）
- 缩放功能
- 拒绝上传非 ZIP 文件
- 拒绝超过 100MB 的文件
- 正确处理解析失败的 ZIP
- 阻止无权限用户访问预览资源

### ✅ 04-inspect-comment.spec.ts - 实时标注与评论功能
- 开启实时标注模式（Inspector）
- hover 元素显示规格信息
- 锁定元素查看详细规格
- 创建标注点和评论
- 回复评论
- 刷新页面后评论保留
- 标记评论为已解决
- 阻止无评论权限用户创建评论
- 切换页面后保持评论可见
- 实时标注模式禁止页面交互

### ✅ 05-share-link.spec.ts - 分享链接功能
- 创建分享链接
- 复制分享链接
- 外部用户访问并接受分享
- 外部用户只有只读权限
- 撤销分享链接
- 撤销后外部用户无法访问
- 阻止匿名用户接受分享
- 显示分享链接有效期
- 查看分享链接接受次数

## 运行测试

### 前置条件

1. **启动后端 API 服务**
   ```bash
   cd ../backend
   npm run dev
   ```

2. **确保数据库已迁移并 seed**
   ```bash
   cd ../backend
   npx prisma migrate dev
   npx prisma db seed
   ```

3. **准备测试文件**
   - 确保 `test-fixtures/sample-prototype.zip` 存在
   - 参考 `test-fixtures/README.md`

### 运行命令

```bash
# 运行所有测试（无头模式）
npm run test:e2e

# UI 模式（推荐首次运行或调试）
npm run test:e2e:ui

# 有头模式（查看浏览器操作）
npm run test:e2e:headed

# 调试单个测试
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report
```

### 运行单个测试文件

```bash
npx playwright test e2e/01-auth.spec.ts
npx playwright test e2e/02-team-project-permission.spec.ts --headed
```

### 运行单个测试用例

```bash
npx playwright test -g "应该完成注册"
```

## 测试配置

配置文件：`playwright.config.ts`

关键配置项：
- **baseURL**: `http://localhost:5173`（前端开发服务器）
- **timeout**: 30 秒（单个测试超时）
- **retries**: CI 环境 2 次，本地 0 次
- **workers**: CI 环境 1 个，本地自动
- **screenshot**: 失败时截图
- **video**: 失败时录制视频

## 测试辅助函数

位置：`helpers.ts`

提供的工具函数：
- `login(page, email, password)` - 用户登录
- `register(page, username, email, password)` - 用户注册
- `logout(page)` - 用户登出
- `waitForApiResponse(page, urlPattern, status)` - 等待 API 响应
- `waitForLoadingComplete(page)` - 等待加载完成
- `generateRandomEmail()` - 生成随机邮箱
- `generateRandomUsername()` - 生成随机用户名
- `takeScreenshot(page, name)` - 手动截图

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci
      
      - name: Install Playwright Browsers
        run: cd frontend && npx playwright install --with-deps chromium
      
      - name: Start Backend
        run: cd backend && npm run dev &
      
      - name: Wait for Backend
        run: npx wait-on http://localhost:3001/api/health
      
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## 调试技巧

### 1. 使用 UI 模式
最直观的调试方式：
```bash
npm run test:e2e:ui
```

### 2. 使用调试模式
在断点处暂停：
```bash
npm run test:e2e:debug
```

### 3. 查看截图和视频
失败的测试会自动截图和录制视频，位于：
- `test-results/` - 测试结果
- `playwright-report/` - HTML 报告

### 4. 在测试中添加断点
```typescript
await page.pause(); // 暂停并打开 Playwright Inspector
```

### 5. 查看详细日志
```bash
DEBUG=pw:api npx playwright test
```

## 常见问题

### Q: 测试超时
**A**: 增加 timeout 配置，或者检查后端服务是否正常运行。

### Q: 元素找不到
**A**: 确保页面已完全加载，使用 `waitForLoadingComplete(page)` 或增加显式等待。

### Q: 数据库状态冲突
**A**: 使用独立的测试数据库，或在 `beforeEach` 中清理数据。

### Q: 并发执行失败
**A**: 在 `playwright.config.ts` 中设置 `workers: 1` 强制串行执行。

## 测试数据管理

### 测试账户

预置的测试账户（需要在 seed 中创建）：
- **管理员**: admin@hyperdesign.com / Demo123456
- **普通用户**: chrisj@hyperdesign.com / Demo123456

### 动态创建账户

测试中会动态创建随机账户：
```typescript
const email = generateRandomEmail();
const username = generateRandomUsername();
await register(page, username, email, 'Test123456!');
```

### 清理策略

建议：
- 测试前：重置数据库到已知状态
- 测试后：保留失败测试的数据便于调试
- CI 环境：每次运行前完全重建数据库

## 最佳实践

1. **独立性**：每个测试应该独立，不依赖其他测试的状态
2. **幂等性**：测试可以重复运行，结果一致
3. **快速性**：避免不必要的等待，使用精确的选择器
4. **可读性**：使用 `test.step()` 组织测试步骤
5. **可维护性**：提取公共逻辑到 helpers
6. **错误处理**：为可能失败的操作添加重试或条件判断
7. **并发安全**：避免多个测试操作相同的数据

## 下一步

- [ ] 增加更多边界情况测试
- [ ] 增加性能测试（Lighthouse）
- [ ] 增加无障碍测试（axe-core）
- [ ] 增加跨浏览器测试（Firefox, Safari）
- [ ] 增加移动端测试
- [ ] 集成到 CI/CD pipeline
