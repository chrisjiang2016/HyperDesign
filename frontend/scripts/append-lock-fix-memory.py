from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\memory\2026-07-15.md")
text = path.read_text(encoding="utf-8")
block = """
### Viewer 左键锁定失效修复 ✅
- 根因：`inspector.js` 捕获阶段 `blockInteractiveEvent` / `blockPointerEvent` 对 click、pointerdown 调用了 `stopImmediatePropagation`，阻断了后续锁定 handler
- 修复：inspect 模式下 click/pointerdown 交由 `handleInspectLock`；`pointerdown` 优先锁定，`click` 兜底防重复
- iframe onLoad：`inspector.js?v=6` + script.onload / 300ms 兜底同步 inspect 模式
- `npm run build` 通过（`index-BVmwCQqr.js`）

"""
if "左键锁定失效修复" not in text:
    text = text.replace("## 关键决策", block + "## 关键决策", 1)
    path.write_text(text, encoding="utf-8")
    print("memory updated")
else:
    print("already present")
