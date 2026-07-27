from pathlib import Path

insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")

# find all click-related sections
pos = 0
while True:
    idx = insp.find("click", pos)
    if idx < 0:
        break
    print(f"\n--- at {idx} ---")
    print(insp[max(0, idx-150):idx+350])
    pos = idx + 5

print("\n\n=== shouldBlockInteraction ===")
i = insp.find("shouldBlockInteraction")
print(insp[i:i+500] if i>=0 else "missing")

print("\n\n=== blockInteractiveEvent ===")
i = insp.find("function blockInteractiveEvent")
print(insp[i:i+500] if i>=0 else "missing")
