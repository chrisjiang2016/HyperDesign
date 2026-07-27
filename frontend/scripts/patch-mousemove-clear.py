from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js")
text = path.read_text(encoding="utf-8")

old = """    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === container || container.contains(el)) {
      clearAll();
      hoverEl = null;
      return;
    }
    hoverEl = el;
    render(el, false);
  });
"""

new = """    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === container || container.contains(el)) {
      clearAll();
      hoverEl = null;
      clearSelectionPayload();
      return;
    }
    hoverEl = el;
    render(el, false);
  });
"""

if old not in text:
    raise SystemExit("mousemove blank branch not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("mousemove clear patched")
