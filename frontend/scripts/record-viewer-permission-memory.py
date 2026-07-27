from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### Viewer ProjectSwitcher 权限过滤 ✅
- 规则澄清：下拉仅显示“当前用户所在团队”中，该用户具备 view/edit 权限的项目；无权限项目不显示
- mock 增加 `mockCurrentUserProjectAccess`；Viewer 按团队项目列表 ∩ 权限映射过滤
- 当前产品设计团队示例：project-1/edit、project-2/view、project-4/edit 显示；project-3 未授权隐藏
- `npm run build` 通过（`index-D3QbBXy8.css` / `index-D7zSeeUr.js`）

"""
if "### Viewer ProjectSwitcher 权限过滤 ✅" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already recorded")
