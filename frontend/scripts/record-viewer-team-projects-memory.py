from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### Viewer ProjectSwitcher 数据范围修正 ✅
- 下拉改为 `mockTeamProjects[当前项目.teamId]`，展示当前用户所在团队下的完整项目列表
- 不再从 `mockProjectDetails` 反推，避免只显示有详情 mock 的部分项目
- `npm run build` 通过（`index-D3QbBXy8.css` / `index-YfN3VVHk.js`）

"""
if "### Viewer ProjectSwitcher 数据范围修正 ✅" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already recorded")
