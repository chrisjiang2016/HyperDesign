from pathlib import Path

path = Path(__file__).resolve().parents[1] / "public" / "prototype-assets" / "inspector.js"
text = path.read_text(encoding="utf-8")

start = text.find("    // 属性信息卡")
end = text.find("  // === 构建 Tab 列表 ===")
if start < 0 or end < 0:
    raise SystemExit(f"markers not found: start={start}, end={end}")

replacement = '''    // 规格信息改由右侧【检查器】展示，页面内不再渲染浮动规格框
    postSelectionPayload(el, info, {
      locked: isLockedState,
      distances: {
        top: topDist,
        right: rightDist,
        bottom: bottomDist,
        left: leftDist,
      },
    });
  }

  function postSelectionPayload(el, info, options) {
    options = options || {};
    try {
      var payload = {
        type: 'prototype-inspector-selection',
        locked: !!options.locked,
        label: info.label,
        tagName: el && el.tagName ? el.tagName.toLowerCase() : '',
        size: {
          width: info.rect.width,
          height: info.rect.height,
        },
        position: {
          x: info.rect.x,
          y: info.rect.y,
        },
        distances: options.distances || {
          top: info.rect.y,
          right: Math.max(0, window.innerWidth - (info.rect.x + info.rect.width)),
          bottom: Math.max(0, window.innerHeight - (info.rect.y + info.rect.height)),
          left: info.rect.x,
        },
        margin: info.margin,
        padding: info.padding,
        font: {
          family: info.fontFamilyPrimary,
          size: info.fontSize,
          weight: info.fontWeight,
          lineHeight: info.lineHeight,
          letterSpacing: info.letterSpacing,
          textAlign: info.textAlign,
        },
        colors: {
          text: info.colors.text,
          background: info.colors.background,
          borderTop: info.colors.borderTop,
        },
        borderRadius: info.borderRadius,
        nearestSibling: info.nearestSibling
          ? {
              dir: info.nearestSibling.dir,
              label: info.nearestSibling.label,
              dist: info.nearestSibling.dist,
            }
          : null,
      };
      window.parent.postMessage(payload, '*');
    } catch (err) {
      // ignore
    }
  }

  function clearSelectionPayload() {
    try {
      window.parent.postMessage({ type: 'prototype-inspector-selection', locked: false, cleared: true }, '*');
    } catch (err) {
      // ignore
    }
  }

'''

text = text[:start] + replacement + text[end:]

replacements = [
    (
        """      if (lockedEl) {
        lockedEl = null;
        clearAll();
        hoverEl = null;
      }
      return;
    }

    if (lockedEl === el) {
      // 再次点击同一元素，取消锁定
      lockedEl = null;
      clearAll();
      hoverEl = null;
    } else {
      // 锁定新元素
      lockedEl = el;
      render(el, true);
    }
""",
        """      if (lockedEl) {
        lockedEl = null;
        clearAll();
        hoverEl = null;
        clearSelectionPayload();
      }
      return;
    }

    if (lockedEl === el) {
      // 再次点击同一元素，取消锁定
      lockedEl = null;
      clearAll();
      hoverEl = null;
      clearSelectionPayload();
    } else {
      // 锁定新元素
      lockedEl = el;
      render(el, true);
    }
""",
    ),
    (
        """      if (lockedEl) {
        lockedEl = null;
        clearAll();
        hoverEl = null;
      }
      // 通知父页面退出标注模式
      window.parent.postMessage({ type: 'prototype-inspector-exit' }, '*');
""",
        """      if (lockedEl) {
        lockedEl = null;
        clearAll();
        hoverEl = null;
      }
      clearSelectionPayload();
      // 通知父页面退出标注模式
      window.parent.postMessage({ type: 'prototype-inspector-exit' }, '*');
""",
    ),
    (
        """      } else {
        enabled = false;
        lockedEl = null;
        hoverEl = null;
        tabIndex = -1;
        tabList = [];
        clearAll();
      }
      console.log('[Prototype Inspector] Mode changed to:', viewerMode);
    }
    // 兼容旧协议：inspector 开关
    if (e.data && e.data.type === 'prototype-inspector') {
      enabled = e.data.enabled;
      if (!enabled) {
        lockedEl = null;
        hoverEl = null;
        tabIndex = -1;
        tabList = [];
        clearAll();
      } else {
        tabList = buildTabList();
      }
    }
  });

  console.log('[Prototype Inspector v4] 已加载，支持三种模式控制');
""",
        """      } else {
        enabled = false;
        lockedEl = null;
        hoverEl = null;
        tabIndex = -1;
        tabList = [];
        clearAll();
        clearSelectionPayload();
      }
      console.log('[Prototype Inspector] Mode changed to:', viewerMode);
    }
    // 兼容旧协议：inspector 开关
    if (e.data && e.data.type === 'prototype-inspector') {
      enabled = e.data.enabled;
      if (!enabled) {
        lockedEl = null;
        hoverEl = null;
        tabIndex = -1;
        tabList = [];
        clearAll();
        clearSelectionPayload();
      } else {
        tabList = buildTabList();
      }
    }
  });

  console.log('[Prototype Inspector v5] 已加载：锁定后规格同步到右侧检查器，无页面浮动规格框');
""",
    ),
    (
        """  document.addEventListener('mouseleave', function() {
    if (!enabled) return;
    if (!lockedEl) {
      clearAll();
      hoverEl = null;
    }
  });
""",
        """  document.addEventListener('mouseleave', function() {
    if (!enabled) return;
    if (!lockedEl) {
      clearAll();
      hoverEl = null;
      clearSelectionPayload();
    }
  });
""",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit("replacement block not found")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("inspector.js patched ok")
