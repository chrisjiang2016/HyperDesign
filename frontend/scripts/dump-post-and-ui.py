from pathlib import Path
insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")

j = insp.find("function postSelectionPayload")
print(insp[j:j+1400])
print("\n=== getElementColorInfo ===")
k = insp.find("function getElementColorInfo")
print(insp[k:k+900] if k>=0 else "missing")

print("\n=== InspectedElementSpec ===")
i = page.find("interface InspectedElementSpec")
print(page[i:i+900])
print("\n=== color panel UI ===")
c = page.find("<strong>颜色</strong>")
print(page[c-100:c+900])
