from pathlib import Path
path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### 检查器补齐边框阴影 ✅
- `inspector.js` v7：采集 `boxShadow` + 完整 border（宽/样式/分边色）
- 右侧检查器展示：基础规格内「边框/阴影」+ 颜色面板「Box Shadow」
- `npm run build` 通过（`index-BaM1iS6F.js`）

"""
if "检查器补齐边框阴影" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already")
