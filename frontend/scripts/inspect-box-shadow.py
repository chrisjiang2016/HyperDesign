from pathlib import Path
import re

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")

print("=== inspector style keys ===")
for k in ["boxShadow", "box-shadow", "shadow", "border", "getComputedStyle", "borderRadius", "borderTop", "borderWidth", "borderStyle"]:
    print(k, insp.count(k))

# find getElementInfo
i = insp.find("function getElementInfo")
print("\n=== getElementInfo excerpt ===")
print(insp[i:i+2500] if i>=0 else "missing")

print("\n=== postSelectionPayload excerpt ===")
j = insp.find("function postSelectionPayload")
print(insp[j:j+1200] if j>=0 else "missing")

print("\n=== page inspector UI colors/border ===")
for m in re.finditer(r"边框|阴影|boxShadow|borderRadius|颜色|样式", page):
    print(page[max(0,m.start()-80):m.start()+120].replace("\n"," | "))
    print("---")
