from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")

checks = {
    "inspector postSelectionPayload": "function postSelectionPayload" in insp,
    "inspector clearSelectionPayload": "function clearSelectionPayload" in insp,
    "inspector selection message": "prototype-inspector-selection" in insp,
    "inspector no infoHtml": "infoHtml" not in insp,
    "inspector v5 log": "Prototype Inspector v5" in insp,
    "page InspectedElementSpec": "interface InspectedElementSpec" in page,
    "page inspectedElement state": "useState<InspectedElementSpec | null>" in page,
    "page selection listener": "prototype-inspector-selection" in page,
    "page workbench only": "sections={['workbench']}" in page,
    "page favorites only": "sections={['favorites']}" in page,
    "page inspector UI": "点击预览中的元素以锁定并查看规格" in page,
    "page fmtPx": "const fmtPx" in page,
}

for k, v in checks.items():
    print(f"{'OK' if v else 'FAIL'}: {k}")

# left sidebar order
i = page.find("const leftSidebar")
print("--- LEFT ORDER ---")
print(page[i:i + 1800])

# click lock flow
j = insp.find("lockedEl = el")
print("--- LOCK FLOW ---")
print(insp[j - 500:j + 250] if j >= 0 else "missing")

# floating card remnants
for needle in ["-info", "info-card", "规格卡", "attribute info"]:
    print(f"needle {needle!r}: {insp.find(needle)}")
