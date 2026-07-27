from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### ProjectSwitcher（项目详情切换器）✅
- 严格按 `prototype/project-detail.html`：左栏顶部「当前项目」触发器 + 下拉项目列表
- 仅使用同团队且存在详情数据的 `mockProjectDetails`；没有新增原型外功能
- 切换其他项目后跳转 `/projects/:projectId`，当前项浅蓝高亮
- `npm run build` 通过（`index-CCwfHRAY.css` / `index-DqACoLU3.js`）

文档：`HTML prototype/docs/HyperDesign-ProjectSwitcher_2026-07-15.md`

"""
if "### ProjectSwitcher（项目详情切换器）✅" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already recorded")
