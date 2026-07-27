from pathlib import Path
import re

page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")
css = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\styles\shell.css").read_text(encoding="utf-8")

# find overlay classes near iframe
i = page.find("<iframe")
print(page[i-1500:i+200])

print("\n=== CSS pointer-events near viewer ===")
for m in re.finditer(r"\.pv-[^{]+\{[^}]*pointer-events[^}]*\}", css, re.S):
    print(m.group(0)[:300])
    print("---")

for name in [".pv-marker-layer", ".pv-overlay", ".pv-live-frame", ".pv-frame-body", ".pv-canvas-stage"]:
    idx = css.find(name)
    print(f"\n{name} @ {idx}")
    if idx >= 0:
        print(css[idx:idx+350])
