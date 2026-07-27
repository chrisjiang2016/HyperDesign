from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")

checks = {
    "insp boxShadow field": "boxShadow: boxShadow" in insp or "boxShadow: info.boxShadow" in insp,
    "insp border summary": "borderSummary" in insp,
    "insp v7": "Prototype Inspector v7" in insp,
    "page boxShadow type": "boxShadow: string" in page,
    "page border type": "border: {" in page and "equal: boolean" in page,
    "page UI Box Shadow": "Box Shadow" in page,
    "page UI 阴影": "阴影" in page,
}
for k, v in checks.items():
    print(("OK" if v else "FAIL"), k)
