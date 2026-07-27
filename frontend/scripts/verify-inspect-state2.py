from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")

# ensure render posts selection and does not create floating DOM
i = insp.find("function render(")
print("render start", i)
print(insp[i:i+2500])
print("---CLEARALL---")
j = insp.find("function clearAll")
print(insp[j:j+700] if j>=0 else "missing")
print("---mousemove/hover---")
for needle in ["mousemove", "mouseover", "pointermove", "hoverEl"]:
    print(needle, insp.count(needle))
