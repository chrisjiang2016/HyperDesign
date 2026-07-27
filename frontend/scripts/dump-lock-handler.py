from pathlib import Path
insp = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js").read_text(encoding="utf-8")
i = insp.find("// 点击 - 锁定/取消锁定")
print(insp[i:i+900])
print("\n=== blockInteractive full ===")
j = insp.find("function blockInteractiveEvent")
print(insp[j:j+280])
