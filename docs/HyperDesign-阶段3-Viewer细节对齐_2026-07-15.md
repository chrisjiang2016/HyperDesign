# HyperDesign 阶段 3：Viewer 细节对齐

> 日期：2026-07-15  
> 状态：✅ 完成（视觉/结构对齐 `prototype/prototype-viewer.html`）  
> 验证：`npm run build` 通过

---

## 1. 目标

在保留 Viewer **真实 HTML 预览 / 标注点 / 评论创建回复 / inspect 模式** 核心能力的前提下，把 UI 从旧暗色壳切到与 HTML 原型一致的浅色蓝系工作台。

视觉基准：`HTML prototype/prototype/prototype-viewer.html`

---

## 2. 完成清单

### 顶栏
- 返回按钮 + 文件标题
- meta pills（页面数 / 评审状态 / 副标题）
- 实时标注 / 评论模式 chip
- 导出标注 + 分享

### 左侧栏
- 工作台 NavTree
- 原型内页面列表（path + 评论数 / 当前）
- 本轮评审重点 note

### 中间画布
- 工具条：左右栏折叠、缩放、设备切换、状态 chip
- 浅色 canvas 背景
- inspect banner（Tab / Esc）
- 浏览器 frame 壳：三点 + URL 条 + HTML Prototype pill
- iframe 真实预览 + 标注覆盖层

### 右侧栏
- 检查器（实时标注开启时）
- 评论面板 / 回复列表
- 底部评论 composer + 草稿位置提示

### 交互保留
- 真实 HTML iframe 预览
- 页面切换
- 桌面 / 平板 / 移动
- 缩放 60%–200%
- 评论模式点击新增标注
- 标注与评论联动
- inspect 模式 + Esc 退出
- 左右栏折叠

---

## 3. 关键文件

- `frontend/src/pages/projects/PrototypeViewerPage.tsx`（结构重写）
- `frontend/src/styles/shell.css`（新增 `pv-*` Viewer 样式）
- Layout：继续使用 `ViewerShellLayout` 折叠能力

---

## 4. 验证

```bash
cd "HTML prototype/frontend"
npm run build
```

结果：TypeScript + Vite 构建通过。

预览路径：

```text
/files/file-1/preview
```

---

## 5. 下一步建议

1. 项目详情侧栏 ProjectSwitcher
2. Viewer 标注持久化接后端
3. 鉴权与上传联调
4. 响应式与空状态继续打磨

开工口令：`继续 ProjectSwitcher` 或 `开始后端联调`
