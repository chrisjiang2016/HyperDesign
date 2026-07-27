# HyperDesign Axure ZIP Spike 验证记录

> 验证时间：2026-07-15 18:46–18:52 GMT+8  
> 样例文件：`C:\Users\Chris J\Documents\产品文档\HSB2B-小程序-演示版本.zip`  
> 文件大小：1,444,549 bytes（约 1.38 MB）  
> 结论：**ZIP 解析、页面识别、受控资源读取通过；Axure 页面运行态/动态面板需在 Viewer 接入真实 Preview API 后进行浏览器级回归。**

---

## 1. 样例结构识别

该文件是标准 Axure RP HTML 导出包，包含：

```text
HSB2B-小程序-演示版本/     # ZIP 顶层包装目录
├── index.html
├── start.html
├── data/
├── files/
├── images/
├── resources/
└── plugins/
```

原始 ZIP：

- 总条目：280
- HTML 条目：16
- 实际业务原型页面：5 个 + 入口页 `index.html`
- Axure 资源目录：`data/`、`files/`、`images/`、`resources/`

## 2. 发现的问题与修复

### P0-AX-01：ZIP 顶层包装目录

**现象**：该 Axure ZIP 所有文件被包在 `HSB2B-小程序-演示版本/` 顶层目录中。初版解析后：

- 页面 relativePath 会带顶层目录；
- 资源相对路径会错位；
- `index.html` 不能作为根目录入口正确服务。

**修复**：当解压目录仅有一个顶层文件夹时，将其内容提升到文件根目录（flatten single root directory）。

**结果**：最终入口页正确识别为：

```text
index.html
```

而不是：

```text
HSB2B-小程序-演示版本/index.html
```

### P0-AX-02：Axure 资源 HTML 被错误当作页面

**现象**：初版递归扫描得到 16 个 HTML，包括：

```text
resources/chrome/*.html
resources/expand.html
resources/Other.html
resources/reload.html
start.html
start_c_1.html
start_with_pages.html
```

它们是浏览器兼容提示、内部辅助页或启动文件，不应该出现在用户可切换的原型页面目录中。

**修复**：页面扫描阶段过滤：

- `resources/**`
- `start.html`
- `start_c_1.html`
- `start_with_pages.html`

**结果**：页面目录从 16 项收敛为 6 项：入口页 + 5 个业务页面。

### P1-AX-03：HTML Title 使用数字实体编码

**现象**：入口页 Title 返回 `&#x65E0;&#x6807;&#x9898;&#x6587;&#x6863;`。

**修复**：HTML `<title>` 提取后解码十进制/十六进制数字实体。

**结果**：返回 `无标题文档`。

### P1-AX-04：中文资源路径 URL 编码

**现象**：浏览器请求中文目录资源时会用 `%E5...` 编码，初版服务端直接按编码文本访问磁盘，导致资源读取失败。

**修复**：预览资源路由在安全校验前使用 `decodeURIComponent`，随后再做路径规范化与根目录边界检查。

**结果**：包含中文路径的 `data.js`、CSS、SVG、PNG 均可受控读取。

### P1-AX-05：缺失的 Axure handoff 插件样式

入口 `index.html` 引用了：

```text
plugins/handoff/styles/handoff.css
plugins/handoff/styles/codemirror.css
```

但这两个资源不在该 ZIP 的 280 个条目中，属于**原始 Axure 导出包本身缺失的引用资源**，不是平台解压丢失。

**处理**：预览资源路由将这类资源返回标准 `404 / NOT_FOUND`，不再抛出内部 `500`。该问题是否影响正常原型主流程，需要进入浏览器真实运行态验证。

---

## 3. 真实上传验证结果

使用 `admin / Demo123456` 登录后，将用户提供 ZIP 上传到当前 Sprint 0 Spike 接口：

```text
POST /api/files/spike-upload
```

最终结果：

```json
{
  "parseStatus": "success",
  "pageCount": 6,
  "entry": "index.html"
}
```

识别出的页面：

```text
index.html                         # 入口页
小程序欢迎页.html
微信小程序授权.html
数字中台-b2b标准前端.html
标准小程序-授权登录注册流程.html
输入用户名密码.html
```

## 4. 资源访问验证

下列资源均通过已登录会话的受控资源路由读取成功：

```text
index.html
数据/运行时资源：data/document.js
页面数据：files/小程序欢迎页/data.js
图片资源：images/小程序欢迎页/u100.png
```

验证的安全边界：

```text
请求 ../.env       → 400（路径遍历拦截）
请求不存在资源     → 404（标准 NOT_FOUND）
```

## 5. 当前结论

### 已通过

- [x] Axure ZIP 上传
- [x] 顶层目录 ZIP 兼容
- [x] 安全解压
- [x] HTML 页面识别
- [x] Axure 辅助 HTML 过滤
- [x] 入口页识别
- [x] 中文文件名和资源路径
- [x] JavaScript、CSS、PNG/SVG 等受控资源读取
- [x] 路径穿越拦截
- [x] 不存在资源标准 404

### 待进入 Sprint 4 的浏览器级验证

- [ ] 在真实 Viewer iframe 中加载本样例 `index.html`。
- [ ] 确认 Axure 页面树、导航跳转、动态面板、交互脚本实际可运行。
- [ ] 对缺失的 handoff CSS 确认是否仅影响 Axure Handoff 面板，还是会影响主原型画面。
- [ ] 验证 Inspector 注入不干扰 Axure 交互。

> 当前 Sprint 0 服务端 Spike 已通过“可解析、可服务资源”的核心门槛；但“动态面板真实交互”必须在前端 Viewer 完成真实 Preview API 接入后做浏览器 E2E，不能以单纯 HTTP 请求替代。
