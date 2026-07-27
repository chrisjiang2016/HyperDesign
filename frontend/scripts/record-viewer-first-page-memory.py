from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### Viewer ProjectSwitcher 跳转首个原型第一页 ✅
- 点击切换项目不再跳转项目详情，直接进入目标项目的首个可预览原型文件，并强制打开第一页
- 新增 `mockProjectFirstViewerFile`：project-1→file-1，project-2→file-2，project-4→file-3
- URL 使用 `?page=<firstPageId>`，优先于 mock `isCurrent`，确保打开第一页面
- `npm run build` 通过（`index-D3QbBXy8.css` / `index-38RMomKH.js`）

"""
if "### Viewer ProjectSwitcher 跳转首个原型第一页 ✅" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already recorded")
