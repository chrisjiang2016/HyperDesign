# E2E 测试夹具说明

## 必需的测试文件

为了运行 E2E 测试，你需要准备以下测试文件并放置在此目录下：

### 1. sample-prototype.zip
一个真实的 Axure 导出 ZIP 文件，包含：
- 至少 2 个 HTML 页面
- 动态面板（用于测试交互）
- 多层页面树结构
- 相对资源引用（CSS/JS/图片）

### 2. empty.zip
一个合法的 ZIP 文件，但不包含任何 HTML 文件。
用于测试解析失败的场景。

### 3. not-a-zip.txt
一个普通文本文件，用于测试文件类型验证。

## 如何准备测试文件

### sample-prototype.zip
1. 使用 Axure RP 打开任意原型项目
2. 选择 "Publish" → "Generate HTML Files"
3. 生成完成后，将输出目录压缩为 ZIP
4. 重命名为 `sample-prototype.zip`
5. 放置在当前目录

**推荐使用的真实文件：**
```
C:\Users\Chris J\Documents\产品文档\HSB2B-小程序-演示版本.zip
```
可以复制到此目录并重命名。

### empty.zip
```bash
# Windows PowerShell
Compress-Archive -Path .\README.md -DestinationPath .\empty.zip
# 然后删除 ZIP 内的文件，保留空 ZIP
```

或者创建一个只包含非 HTML 文件的 ZIP：
```bash
echo "test" > test.txt
Compress-Archive -Path .\test.txt -DestinationPath .\empty.zip
```

### not-a-zip.txt
```bash
echo "This is not a ZIP file" > not-a-zip.txt
```

## 测试数据库

E2E 测试会使用独立的测试数据库，不会影响开发数据库。

测试前需要确保：
1. 后端 API 服务正在运行（`npm run dev`）
2. 数据库已迁移并 seed 了测试数据
3. 管理员账户存在：
   - Email: admin@hyperdesign.com
   - Password: Demo123456

## 运行测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# UI 模式（推荐调试时使用）
npm run test:e2e:ui

# 有头模式（可以看到浏览器）
npm run test:e2e:headed

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report
```

## 注意事项

1. **测试文件大小**：sample-prototype.zip 建议不超过 50MB，避免测试超时
2. **并发执行**：默认配置为串行执行，避免数据竞争
3. **测试隔离**：每个测试用例应该独立，不依赖其他测试的数据
4. **清理策略**：测试完成后会自动清理临时数据（可选）
