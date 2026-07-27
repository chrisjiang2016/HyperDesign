from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
checks = {
    "v6 log": "Prototype Inspector v6" in insp,
    "handleInspectLock": "function handleInspectLock" in insp,
    "pointerdown lock": "document.addEventListener('pointerdown', function(e)" in insp,
    "inspect click skip in blockInteractive": "viewerMode === 'inspect' && (e.type === 'click' || e.type === 'dblclick')" in insp,
    "pointerdown skip in blockPointer": "e.type === 'pointerdown' || e.type === 'mousedown' || e.type === 'touchstart'" in insp,
}
for k, v in checks.items():
    print(("OK" if v else "FAIL"), k)

i = insp.find("function blockInteractiveEvent")
print("\n=== blockInteractiveEvent ===")
print(insp[i:i+500])
print("\n=== handleInspectLock ===")
j = insp.find("function handleInspectLock")
print(insp[j:j+900])
