from pathlib import Path

root = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets")
for path in sorted(root.glob("*.html")):
    text = path.read_text(encoding="utf-8", errors="ignore")
    print(path.name)
    print("  inspector.js:", "inspector.js" in text)
    print("  __prototypeInspector:", "__prototypeInspector" in text)
    # show script tags
    for line in text.splitlines():
        if "script" in line.lower() and ("inspector" in line.lower() or "src=" in line.lower()):
            print(" ", line.strip()[:200])
    print()
