from pathlib import Path

# search frontend for inspector injection points
root = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend")
needles = ["inspector.js", "__prototypeInspector", "prototype-assets", "injectInspector", "srcDoc", "sandbox"]

for path in root.rglob("*"):
    if not path.is_file():
        continue
    if path.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".md", ".json"}:
        continue
    if "node_modules" in path.parts or "dist" in path.parts:
        continue
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        continue
    hits = [n for n in needles if n in text]
    if hits:
        print(f"{path.relative_to(root)} -> {hits}")
