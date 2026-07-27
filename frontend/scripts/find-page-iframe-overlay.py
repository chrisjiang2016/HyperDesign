from pathlib import Path
import re

page = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx").read_text(encoding="utf-8")

# extract send functions and canvas JSX-ish region
for name in ["sendViewerMode", "sendInspectorState", "toggleInspect", "onIframeLoad", "handleFrameClick", "markers", "pv-frame", "pv-canvas", "iframeRef"]:
    print(name, page.find(name))

# print sendInspectorState and around canvas
for needle in ["const sendInspectorState", "const toggleInspect", "iframeRef", "className=\"pv-", "<iframe"]:
    i = page.find(needle)
    print(f"\n==== {needle} @ {i} ====")
    if i >= 0:
        print(page[i:i+700])
