# HyperDesign Viewer 实时标注修复（2026-07-15）

## 问题

1. 实时标注模式下，点击预览元素后规格浮动在页面内，未同步到右侧【检查器】
2. 左侧栏「常用」位置不在「原型内页面」下方

## 修复

### 1. `public/prototype-assets/inspector.js`（v5）

- 移除页面内浮动规格卡（info card）
- 锁定/悬停时通过 `postMessage` 发送 `prototype-inspector-selection`
- 解锁 / Esc / 关闭模式 / 鼠标离开空白时发送 `cleared: true`
- 保留绿色锁定框、标尺与兄弟连线

### 2. `src/pages/projects/PrototypeViewerPage.tsx`

- 新增 `inspectedElement` 状态，监听 `prototype-inspector-selection`
- 右侧【检查器】展示：尺寸、位置、距画布、字体、颜色、Margin/Padding、最近兄弟
- 关闭实时标注 / 切评论模式 / 切页时清空检查器

### 3. 左侧栏顺序

`工作台` → `原型内页面` → `常用` → `本轮评审`

实现方式：

```tsx
<NavTree sections={['workbench']} />
{/* 原型内页面 */}
<NavTree sections={['favorites']} />
```

## 验证

- `npm run build` 通过
- 构建产物：`dist/assets/index-BeGepXMh.css`、`dist/assets/index-BQusCl0I.js`

## 手动验收

1. 打开 `/files/file-1/preview`，开启「实时标注」
2. 悬停元素 → 右侧检查器更新；页面无浮动规格框
3. 左键点击 → 锁定（绿框）+ 检查器显示完整规格
4. 再点同一元素 / 点空白 → 解锁并清空检查器
5. Esc → 退出实时标注
6. 左栏顺序：工作台 → 原型内页面 → 常用
