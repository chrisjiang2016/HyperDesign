# HyperDesign Viewer ProjectSwitcher 调整记录

> 日期：2026-07-15  
> 状态：✅ 完成  
> 依据：用户提供的 Viewer 截图与权限、跳转规则澄清

## 位置与结构

Viewer 左侧栏：

```text
当前项目（ProjectSwitcher）
原型内页面
常用
本轮评审
```

「当前项目」ProjectSwitcher 替换了原先的：

```text
工作台 → 我的团队
```

## 下拉数据规则

下拉内容必须同时满足：

1. 项目属于当前用户所在的当前团队
2. 当前用户对项目具有查看（`view`）或编辑（`edit`）权限

未在 `mockCurrentUserProjectAccess` 内的项目视为无权限，不渲染到切换器中。

## 切换跳转规则（最新）

在 Viewer 中点击其他项目时：

```text
当前项目 → 该项目的首个可预览原型文件 → 该文件的第一页
```

不再跳转项目详情页。

实现：

```ts
const nextFileId = mockProjectFirstViewerFile[item.id]
const firstPageId = mockViewerFiles[nextFileId]?.pages[0]?.id
navigate(`/files/${nextFileId}/preview?page=${encodeURIComponent(firstPageId)}`)
```

`page` 查询参数优先于文件自身的 `isCurrent` mock，确保每次项目切换都打开**第一页**。

当前 mock 映射：

| 项目 | 首个原型文件 | 打开的第一页 |
|------|-------------|-------------|
| 电商平台改版 | `file-1` | 登录页（`viewer-page-1`） |
| 客户管理系统 | `file-2` | 登录页（`viewer-page-21`） |
| 移动端 APP V3.0 | `file-3` | 项目详情（`viewer-page-31`） |

如果项目没有首个可预览文件映射，显示提示，不执行错误跳转。

## 范围控制

- 不展示权限标签，不新增权限管理 UI
- 未新增搜索、新建、筛选或其他原型外入口
- Viewer 内「原型内页面 / 常用 / 本轮评审」保持不变
- 后端联调后：权限映射、首个文件映射应由真实接口替换

## 修改文件

- `frontend/src/store/mockData.ts`
- `frontend/src/store/viewerMockData.ts`
- `frontend/src/pages/projects/PrototypeViewerPage.tsx`
- `frontend/src/styles/shell.css`

## 验证

```bash
cd "HTML prototype/frontend"
npm run build
```

结果：TypeScript + Vite 构建通过。

最新构建：
- `dist/assets/index-D3QbBXy8.css`
- `dist/assets/index-38RMomKH.js`
