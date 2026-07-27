from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### Viewer 左栏 ProjectSwitcher ✅
- 按用户截图需求，Viewer 左栏顶部放「当前项目」切换器，替换原「工作台 → 我的团队」树
- 左栏最终顺序：当前项目 → 原型内页面 → 常用 → 本轮评审
- 保留已有项目数据与路由切换；不加原型外功能
- `npm run build` 通过（`index-D3QbBXy8.css` / `index-C16K8qmU.js`）

文档：`HTML prototype/docs/HyperDesign-ViewerProjectSwitcher_2026-07-15.md`

"""
if "### Viewer 左栏 ProjectSwitcher ✅" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already recorded")
