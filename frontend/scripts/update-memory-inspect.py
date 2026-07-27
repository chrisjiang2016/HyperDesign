from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")

block = """
### Viewer 实时标注 bug 修复 ✅
1. 点击预览元素锁定，规格只显示在右侧【检查器】，去掉页面浮动规格框
2. `inspector.js` v5：postMessage `prototype-inspector-selection` 同步规格；解锁/Esc/关闭模式/空白清空
3. 左栏顺序：工作台 → 原型内页面 → 常用 → 本轮评审
4. `npm run build` 通过（`index-BeGepXMh.css` / `index-BQusCl0I.js`）

文档：
- `HTML prototype/docs/HyperDesign-Viewer实时标注修复_2026-07-15.md`

"""

needle = "## 关键决策"
if "Viewer 实时标注 bug 修复" not in text:
    if needle not in text:
        raise SystemExit("needle not found")
    text = text.replace(needle, block + needle, 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already present")
