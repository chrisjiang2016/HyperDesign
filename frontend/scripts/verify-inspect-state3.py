from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
# show end of render function
start = insp.find("function render(")
# find postSelectionPayload call after render start
call = insp.find("postSelectionPayload", start)
print("first postSelectionPayload after render", call)
print(insp[call-300:call+400])
print("---mousemove handler---")
m = insp.find("addEventListener('mousemove'")
print(insp[m:m+500] if m>=0 else "missing")
print("---clearSelection on disable---")
print("clearSelectionPayload count", insp.count("clearSelectionPayload()"))
print("postSelectionPayload count", insp.count("postSelectionPayload("))
