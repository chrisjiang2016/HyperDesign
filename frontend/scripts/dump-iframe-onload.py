from pathlib import Path
page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")
i = page.find("<iframe")
print(page[i:i+1400])
print("\n=== effects with inspect/mode ===")
for needle in ["useEffect", "sendViewerMode(", "sendInspectorState(", "inspectMode"]:
    pass
# print useEffects related
import re
for m in re.finditer(r"useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\)", page):
    block = m.group(0)
    if any(k in block for k in ["inspect", "ViewerMode", "Inspector", "iframe", "commentMode"]):
        print(block[:800])
        print("---")
