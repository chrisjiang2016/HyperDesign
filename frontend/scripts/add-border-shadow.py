from pathlib import Path

insp_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js")
page_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")

insp = insp_path.read_text(encoding="utf-8")
page = page_path.read_text(encoding="utf-8")

# 1) getElementInfo: add border + boxShadow
old_return = """    return {
      label,
      rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      margin: { top: mt, right: mr, bottom: mb, left: ml },
      padding: { top: pt, right: pr, bottom: pb, left: pl },
      nearestSibling,
      parent: parentRect ? { rect: parentRect } : null,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      fontFamilyPrimary: getPrimaryFontFamily(style.fontFamily),
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textAlign: style.textAlign,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      colors: getElementColorInfo(style),
    };
  }
"""

new_return = """    const borderTopWidth = style.borderTopWidth || '0px';
    const borderRightWidth = style.borderRightWidth || '0px';
    const borderBottomWidth = style.borderBottomWidth || '0px';
    const borderLeftWidth = style.borderLeftWidth || '0px';
    const borderTopStyle = style.borderTopStyle || 'none';
    const borderRightStyle = style.borderRightStyle || 'none';
    const borderBottomStyle = style.borderBottomStyle || 'none';
    const borderLeftStyle = style.borderLeftStyle || 'none';
    const boxShadow = style.boxShadow && style.boxShadow !== 'none' ? style.boxShadow : 'none';

    // 统一边框摘要：四边一致则单行，否则分边展示
    const borderSidesEqual =
      borderTopWidth === borderRightWidth &&
      borderTopWidth === borderBottomWidth &&
      borderTopWidth === borderLeftWidth &&
      borderTopStyle === borderRightStyle &&
      borderTopStyle === borderBottomStyle &&
      borderTopStyle === borderLeftStyle &&
      style.borderTopColor === style.borderRightColor &&
      style.borderTopColor === style.borderBottomColor &&
      style.borderTopColor === style.borderLeftColor;

    const borderSummary = borderSidesEqual
      ? (borderTopStyle === 'none' || borderTopWidth === '0px'
          ? 'none'
          : borderTopWidth + ' ' + borderTopStyle)
      : {
          top: borderTopWidth + ' ' + borderTopStyle,
          right: borderRightWidth + ' ' + borderRightStyle,
          bottom: borderBottomWidth + ' ' + borderBottomStyle,
          left: borderLeftWidth + ' ' + borderLeftStyle,
        };

    return {
      label,
      rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      margin: { top: mt, right: mr, bottom: mb, left: ml },
      padding: { top: pt, right: pr, bottom: pb, left: pl },
      nearestSibling,
      parent: parentRect ? { rect: parentRect } : null,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      fontFamilyPrimary: getPrimaryFontFamily(style.fontFamily),
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textAlign: style.textAlign,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: boxShadow,
      border: {
        summary: borderSummary,
        width: {
          top: borderTopWidth,
          right: borderRightWidth,
          bottom: borderBottomWidth,
          left: borderLeftWidth,
        },
        style: {
          top: borderTopStyle,
          right: borderRightStyle,
          bottom: borderBottomStyle,
          left: borderLeftStyle,
        },
        equal: borderSidesEqual,
      },
      colors: getElementColorInfo(style),
    };
  }
"""

if old_return not in insp:
    raise SystemExit("getElementInfo return not found")
insp = insp.replace(old_return, new_return, 1)

# 2) postSelectionPayload: include border + boxShadow
old_payload_tail = """        colors: {
          text: info.colors.text,
          background: info.colors.background,
          borderTop: info.colors.borderTop,
        },
        borderRadius: info.borderRadius,
        nearestSibling: info.nearestSibling
"""

new_payload_tail = """        colors: {
          text: info.colors.text,
          background: info.colors.background,
          borderTop: info.colors.borderTop,
          borderRight: info.colors.borderRight,
          borderBottom: info.colors.borderBottom,
          borderLeft: info.colors.borderLeft,
        },
        borderRadius: info.borderRadius,
        boxShadow: info.boxShadow || 'none',
        border: info.border || {
          summary: 'none',
          width: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
          style: { top: 'none', right: 'none', bottom: 'none', left: 'none' },
          equal: true,
        },
        nearestSibling: info.nearestSibling
"""

if old_payload_tail not in insp:
    raise SystemExit("postSelectionPayload colors block not found")
insp = insp.replace(old_payload_tail, new_payload_tail, 1)

insp = insp.replace(
    "console.log('[Prototype Inspector v6] 已加载：修复左键锁定（避免 capture stopImmediatePropagation 阻断）');",
    "console.log('[Prototype Inspector v7] 已加载：检查器同步边框与 box-shadow');",
)

insp_path.write_text(insp, encoding="utf-8")
print("inspector.js updated")

# 3) page types
old_spec = """  colors: {
    text: InspectedColorInfo
    background: InspectedColorInfo
    borderTop: InspectedColorInfo
  }
  borderRadius: string
  nearestSibling: { dir: string; label: string; dist: number } | null
}
"""

new_spec = """  colors: {
    text: InspectedColorInfo
    background: InspectedColorInfo
    borderTop: InspectedColorInfo
    borderRight?: InspectedColorInfo
    borderBottom?: InspectedColorInfo
    borderLeft?: InspectedColorInfo
  }
  borderRadius: string
  boxShadow: string
  border: {
    summary: string | { top: string; right: string; bottom: string; left: string }
    width: { top: string; right: string; bottom: string; left: string }
    style: { top: string; right: string; bottom: string; left: string }
    equal: boolean
  }
  nearestSibling: { dir: string; label: string; dist: number } | null
}
"""

if old_spec not in page:
    raise SystemExit("InspectedElementSpec colors not found")
page = page.replace(old_spec, new_spec, 1)

# 4) message handler defaults
old_msg = """          colors: data.colors || {
            text: { hex: '-', rgb: '-' },
            background: { hex: '-', rgb: '-' },
            borderTop: { hex: '-', rgb: '-' },
          },
          borderRadius: data.borderRadius || '0px',
          nearestSibling: data.nearestSibling || null,
"""

new_msg = """          colors: data.colors || {
            text: { hex: '-', rgb: '-' },
            background: { hex: '-', rgb: '-' },
            borderTop: { hex: '-', rgb: '-' },
            borderRight: { hex: '-', rgb: '-' },
            borderBottom: { hex: '-', rgb: '-' },
            borderLeft: { hex: '-', rgb: '-' },
          },
          borderRadius: data.borderRadius || '0px',
          boxShadow: data.boxShadow || 'none',
          border: data.border || {
            summary: 'none',
            width: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
            style: { top: 'none', right: 'none', bottom: 'none', left: 'none' },
            equal: true,
          },
          nearestSibling: data.nearestSibling || null,
"""

if old_msg not in page:
    raise SystemExit("message handler defaults not found")
page = page.replace(old_msg, new_msg, 1)

# 5) UI: expand 基础规格 round + colors/border/shadow panel
old_ui = """                <div className="pv-inspector-row">
                  <span>圆角</span>
                  <strong>{inspectedElement.borderRadius}</strong>
                </div>
              </div>

              <div className="pv-panel-card">
                <strong>距画布</strong>
"""

new_ui = """                <div className="pv-inspector-row">
                  <span>圆角</span>
                  <strong>{inspectedElement.borderRadius}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>边框</span>
                  <strong style={{ textAlign: 'right', maxWidth: 180, wordBreak: 'break-all' }}>
                    {typeof inspectedElement.border.summary === 'string'
                      ? inspectedElement.border.summary
                      : `T ${inspectedElement.border.summary.top} / R ${inspectedElement.border.summary.right} / B ${inspectedElement.border.summary.bottom} / L ${inspectedElement.border.summary.left}`}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>阴影</span>
                  <strong style={{ textAlign: 'right', maxWidth: 180, wordBreak: 'break-all' }}>
                    {inspectedElement.boxShadow}
                  </strong>
                </div>
              </div>

              <div className="pv-panel-card">
                <strong>距画布</strong>
"""

if old_ui not in page:
    raise SystemExit("basic specs UI not found")
page = page.replace(old_ui, new_ui, 1)

old_color_ui = """              <div className="pv-panel-card">
                <strong>颜色</strong>
                <div className="pv-inspector-row">
                  <span>文字色</span>
                  <strong>{inspectedElement.colors.text.hex}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>背景色</span>
                  <strong>{inspectedElement.colors.background.hex}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>边框色</span>
                  <strong>{inspectedElement.colors.borderTop.hex}</strong>
                </div>
              </div>
"""

new_color_ui = """              <div className="pv-panel-card">
                <strong>颜色 / 边框阴影</strong>
                <div className="pv-inspector-row">
                  <span>文字色</span>
                  <strong>{inspectedElement.colors.text.hex}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>背景色</span>
                  <strong>{inspectedElement.colors.background.hex}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>边框色</span>
                  <strong>
                    {inspectedElement.border.equal
                      ? inspectedElement.colors.borderTop.hex
                      : `T ${inspectedElement.colors.borderTop.hex} / R ${(inspectedElement.colors.borderRight || inspectedElement.colors.borderTop).hex} / B ${(inspectedElement.colors.borderBottom || inspectedElement.colors.borderTop).hex} / L ${(inspectedElement.colors.borderLeft || inspectedElement.colors.borderTop).hex}`}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>边框宽</span>
                  <strong>
                    {inspectedElement.border.equal
                      ? inspectedElement.border.width.top
                      : `${inspectedElement.border.width.top} / ${inspectedElement.border.width.right} / ${inspectedElement.border.width.bottom} / ${inspectedElement.border.width.left}`}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>边框样式</span>
                  <strong>
                    {inspectedElement.border.equal
                      ? inspectedElement.border.style.top
                      : `${inspectedElement.border.style.top} / ${inspectedElement.border.style.right} / ${inspectedElement.border.style.bottom} / ${inspectedElement.border.style.left}`}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Box Shadow</span>
                  <strong style={{ textAlign: 'right', maxWidth: 180, wordBreak: 'break-all' }}>
                    {inspectedElement.boxShadow}
                  </strong>
                </div>
              </div>
"""

if old_color_ui not in page:
    raise SystemExit("color UI not found")
page = page.replace(old_color_ui, new_color_ui, 1)

page_path.write_text(page, encoding="utf-8")
print("PrototypeViewerPage updated")
