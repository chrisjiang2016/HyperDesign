from pathlib import Path
t = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")
for i, line in enumerate(t.splitlines(), 1):
    if "activeComment" in line or "commentMap" in line:
        print(f"{i}: {line}")
