from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")

print("=== inspector keys ===")
for k in [
    "enabled =",
    "viewerMode",
    "addEventListener('click'",
    "addEventListener(\"click\"",
    "prototype-viewer-mode",
    "prototype-inspector",
    "pointer-events",
    "mousedown",
    "preventDefault",
    "stopPropagation",
    "lockedEl = el",
    "function enable",
    "window.__prototypeInspector",
]:
    print(f"{k}: {insp.count(k)}")

# dump click handler
idx = insp.find("addEventListener('click'")
if idx < 0:
    idx = insp.find('addEventListener("click"')
print("\n=== click handler ===")
print(insp[idx:idx+1200] if idx >= 0 else "NO CLICK HANDLER")

# dump mode message handler
idx2 = insp.find("prototype-viewer-mode")
print("\n=== mode handler ===")
print(insp[idx2-200:idx2+900] if idx2 >= 0 else "NO MODE")

# dump init/enabled
idx3 = insp.find("let enabled")
if idx3 < 0:
    idx3 = insp.find("var enabled")
print("\n=== enabled init ===")
print(insp[idx3:idx3+400] if idx3 >= 0 else "NO ENABLED")

print("\n=== page inspect wiring ===")
for k in [
    "sendViewerMode",
    "sendInspectorState",
    "prototype-viewer-mode",
    "prototype-inspector",
    "toggleInspect",
    "pointer-events",
    "onClick",
    "inspectMode",
]:
    print(f"{k}: {page.count(k)}")

# find iframe overlay / marker layer
i = page.find("iframe")
print("\n=== iframe region snippets ===")
while i >= 0 and i < len(page):
    print(page[max(0,i-120):i+220].replace("\n", " | "))
    print("---")
    i = page.find("iframe", i+1)
    if page.count("iframe") > 8:
        break
