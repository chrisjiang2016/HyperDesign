from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### ProjectSwitcher 去重 ✅
- 根据用户截图反馈，移除了项目详情左栏顶部额外添加的「当前项目」下拉卡片
- 左侧标准 NavTree 的“我的团队 → 团队 → 项目”保留为唯一项目切换入口
- 不额外添加原型外内容
- `npm run build` 通过（`index-BeGepXMh.css` / `index-BaM1iS6F.js`）

"""
if "### ProjectSwitcher 去重 ✅" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already recorded")
