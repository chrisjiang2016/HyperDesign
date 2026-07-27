(function() {
  'use strict';
  if (window.__prototypeInspector) return;
  window.__prototypeInspector = true;

  const NS = '__prototype-inspector';
  const COLORS = {
    border: '#667eea',
    borderLocked: '#22c55e',
    margin: 'rgba(255, 149, 0, 0.25)',
    padding: 'rgba(48, 209, 88, 0.25)',
    content: 'rgba(102, 126, 234, 0.10)',
    guide: '#ff5a7a',
    guideAlpha: 'rgba(255, 90, 122, 0.7)',
    labelBg: 'rgba(15, 23, 42, 0.94)',
    text: '#e2e8f0',
    dim: '#94a3b8',
  };

  function fmt(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function px(v) { return fmt(v) + 'px'; }

  function toHexChannel(value) {
    const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  }

  function normalizeColor(input) {
    if (!input) {
      return { raw: 'transparent', hex: 'transparent', rgb: 'transparent', alpha: 0, isTransparent: true };
    }

    const value = String(input).trim();
    if (value === 'transparent') {
      return { raw: value, hex: 'transparent', rgb: 'transparent', alpha: 0, isTransparent: true };
    }

    const rgbaMatch = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(',').map(part => part.trim());
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      const a = parts[3] == null ? 1 : parseFloat(parts[3]);
      const alpha = Number.isFinite(a) ? a : 1;
      const rgb = alpha === 1
        ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
        : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${fmt(alpha)})`;
      const hex = alpha === 1
        ? `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`
        : `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}${toHexChannel(alpha * 255)}`;
      return { raw: value, hex, rgb, alpha, isTransparent: alpha === 0 };
    }

    const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
    if (hexMatch) {
      let hexValue = hexMatch[1];
      if (hexValue.length === 3 || hexValue.length === 4) {
        hexValue = hexValue.split('').map(char => char + char).join('');
      }
      const hasAlpha = hexValue.length === 8;
      const r = parseInt(hexValue.slice(0, 2), 16);
      const g = parseInt(hexValue.slice(2, 4), 16);
      const b = parseInt(hexValue.slice(4, 6), 16);
      const alpha = hasAlpha ? parseInt(hexValue.slice(6, 8), 16) / 255 : 1;
      const rgb = alpha === 1
        ? `rgb(${r}, ${g}, ${b})`
        : `rgba(${r}, ${g}, ${b}, ${fmt(alpha)})`;
      return { raw: value, hex: `#${hexValue.toUpperCase()}`, rgb, alpha, isTransparent: alpha === 0 };
    }

    return { raw: value, hex: value, rgb: value, alpha: 1, isTransparent: false };
  }

  function getPrimaryFontFamily(fontFamily) {
    if (!fontFamily) return 'inherit';
    return fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  }

  function getElementColorInfo(style) {
    return {
      text: normalizeColor(style.color),
      background: normalizeColor(style.backgroundColor),
      borderTop: normalizeColor(style.borderTopColor),
      borderRight: normalizeColor(style.borderRightColor),
      borderBottom: normalizeColor(style.borderBottomColor),
      borderLeft: normalizeColor(style.borderLeftColor),
    };
  }

  function renderColorSwatch(label, colorInfo) {
    const swatchBg = colorInfo.isTransparent ? 'linear-gradient(135deg, rgba(148,163,184,0.18) 25%, transparent 25%, transparent 50%, rgba(148,163,184,0.18) 50%, rgba(148,163,184,0.18) 75%, transparent 75%, transparent)' : colorInfo.rgb;
    const swatchStyle = `width:14px;height:14px;border-radius:4px;border:1px solid rgba(148,163,184,0.28);background:${swatchBg};background-size:8px 8px;flex:0 0 14px;`;
    return `<div style="background:rgba(255,255,255,0.06);padding:8px 10px;border-radius:8px;display:flex;gap:8px;align-items:flex-start;">
      <div style="${swatchStyle}"></div>
      <div style="min-width:0;">
        <div style="color:#94a3b8;font-size:10px;line-height:1.2;margin-bottom:2px;">${label}</div>
        <div style="color:#e2e8f0;font-size:11px;font-weight:600;line-height:1.4;word-break:break-all;">${colorInfo.hex}</div>
        <div style="color:#cbd5e1;font-size:10px;line-height:1.4;word-break:break-all;">${colorInfo.rgb}</div>
      </div>
    </div>`;
  }

  // === 容器 ===
  const container = document.createElement('div');
  container.id = NS + '-container';
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999999;overflow:hidden;';
  document.body.appendChild(container);

  // === 状态 ===
  let enabled = false;
  let lockedEl = null;
  let hoverEl = null;
  let els = [];
  let tabIndex = -1;
  let tabList = [];

  function clearAll() {
    container.innerHTML = '';
    els = [];
  }

  function createEl(tag, styles = {}, parent = container) {
    const el = document.createElement(tag);
    Object.assign(el.style, {
      position: 'absolute',
      pointerEvents: 'none',
      ...styles,
    });
    parent.appendChild(el);
    els.push(el);
    return el;
  }

  function createLabel(text, x, y, opts = {}) {
    return createEl('div', {
      left: px(x),
      top: px(y),
      background: opts.bg || COLORS.guide,
      color: '#fff',
      fontSize: '11px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", monospace',
      padding: '3px 8px',
      borderRadius: '4px',
      lineHeight: '1.4',
      whiteSpace: 'nowrap',
      zIndex: 1000000,
      fontWeight: 600,
    });
  }

  function createLine(x1, y1, x2, y2, opts = {}) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return createEl('div', {
      left: px(x1),
      top: px(y1),
      width: px(len),
      height: '1px',
      background: opts.color || COLORS.guideAlpha,
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      zIndex: 999998,
    });
  }

  function createEndTick(x, y, vertical) {
    const size = 6;
    return createEl('div', {
      left: px(x - (vertical ? 0.5 : size / 2)),
      top: px(y - (vertical ? size / 2 : 0.5)),
      width: vertical ? '1px' : px(size),
      height: vertical ? px(size) : '1px',
      background: COLORS.guide,
      zIndex: 999998,
    });
  }

  function createRect(x, y, w, h, opts = {}) {
    return createEl('div', {
      left: px(x),
      top: px(y),
      width: px(w),
      height: px(h),
      border: `${opts.borderWidth || 1.5}px solid ${opts.border || COLORS.border}`,
      background: opts.bg || 'transparent',
      zIndex: 999997,
    });
  }

  // === 角标 ===
  function createCorner(x, y, w, h) {
    const size = 8;
    const thickness = 2;
    // 左上
    createEl('div', { left: px(x - 1), top: px(y - 1), width: px(size), height: px(thickness), background: COLORS.border, zIndex: 999999 });
    createEl('div', { left: px(x - 1), top: px(y - 1), width: px(thickness), height: px(size), background: COLORS.border, zIndex: 999999 });
    // 右上
    createEl('div', { left: px(x + w - size + 1), top: px(y - 1), width: px(size), height: px(thickness), background: COLORS.border, zIndex: 999999 });
    createEl('div', { left: px(x + w - 1), top: px(y - 1), width: px(thickness), height: px(size), background: COLORS.border, zIndex: 999999 });
    // 左下
    createEl('div', { left: px(x - 1), top: px(y + h - 1), width: px(size), height: px(thickness), background: COLORS.border, zIndex: 999999 });
    createEl('div', { left: px(x - 1), top: px(y + h - size + 1), width: px(thickness), height: px(size), background: COLORS.border, zIndex: 999999 });
    // 右下
    createEl('div', { left: px(x + w - size + 1), top: px(y + h - 1), width: px(size), height: px(thickness), background: COLORS.border, zIndex: 999999 });
    createEl('div', { left: px(x + w - 1), top: px(y + h - size + 1), width: px(thickness), height: px(size), background: COLORS.border, zIndex: 999999 });
  }

  function createCornerLocked(x, y, w, h) {
    const size = 8;
    const thickness = 2;
    const c = COLORS.borderLocked;
    createEl('div', { left: px(x - 1), top: px(y - 1), width: px(size), height: px(thickness), background: c, zIndex: 999999 });
    createEl('div', { left: px(x - 1), top: px(y - 1), width: px(thickness), height: px(size), background: c, zIndex: 999999 });
    createEl('div', { left: px(x + w - size + 1), top: px(y - 1), width: px(size), height: px(thickness), background: c, zIndex: 999999 });
    createEl('div', { left: px(x + w - 1), top: px(y - 1), width: px(thickness), height: px(size), background: c, zIndex: 999999 });
    createEl('div', { left: px(x - 1), top: px(y + h - 1), width: px(size), height: px(thickness), background: c, zIndex: 999999 });
    createEl('div', { left: px(x - 1), top: px(y + h - size + 1), width: px(thickness), height: px(size), background: c, zIndex: 999999 });
    createEl('div', { left: px(x + w - size + 1), top: px(y + h - 1), width: px(size), height: px(thickness), background: c, zIndex: 999999 });
    createEl('div', { left: px(x + w - 1), top: px(y + h - size + 1), width: px(thickness), height: px(size), background: c, zIndex: 999999 });
  }

  // === 获取元素信息 ===
  function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const parent = el.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : null;

    let label = el.tagName.toLowerCase();
    if (el.id) label += `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c && !c.includes('__prototype'));
      if (classes.length) label += `.${classes.slice(0, 2).join('.')}`;
    }

    const mt = parseFloat(style.marginTop) || 0;
    const mr = parseFloat(style.marginRight) || 0;
    const mb = parseFloat(style.marginBottom) || 0;
    const ml = parseFloat(style.marginLeft) || 0;
    const pt = parseFloat(style.paddingTop) || 0;
    const pr = parseFloat(style.paddingRight) || 0;
    const pb = parseFloat(style.paddingBottom) || 0;
    const pl = parseFloat(style.paddingLeft) || 0;

    // 兄弟元素
    const siblings = [];
    if (parent) {
      for (const sibling of parent.children) {
        if (sibling === el || sibling === container || container.contains(sibling)) continue;
        const sRect = sibling.getBoundingClientRect();
        if (sRect.width === 0 && sRect.height === 0) continue;

        const dx = Math.max(0, Math.max(rect.left - sRect.right, sRect.left - rect.right));
        const dy = Math.max(0, Math.max(rect.top - sRect.bottom, sRect.top - rect.bottom));
        const dist = Math.sqrt(dx * dx + dy * dy);

        let dir = '';
        if (sRect.bottom <= rect.top) dir = '↑';
        else if (sRect.top >= rect.bottom) dir = '↓';
        else if (sRect.right <= rect.left) dir = '←';
        else if (sRect.left >= rect.right) dir = '→';

        if (dir) {
          let sLabel = sibling.tagName.toLowerCase();
          if (sibling.className && typeof sibling.className === 'string') {
            const sClasses = sibling.className.split(' ').filter(c => c);
            if (sClasses.length) sLabel += `.${sClasses[0]}`;
          }
          siblings.push({ el: sibling, dist, dir, label: sLabel });
        }
      }
    }
    siblings.sort((a, b) => a.dist - b.dist);
    const nearestSibling = siblings[0] || null;

    const borderTopWidth = style.borderTopWidth || '0px';
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

  // === 核心渲染 ===
  function render(el, isLocked) {
    if (!el || el === document.body || el === document.documentElement || el === container) {
      clearAll();
      return;
    }
    clearAll();

    const info = getElementInfo(el);
    const r = info.rect;
    const m = info.margin;
    const p = info.padding;
    const isLockedState = isLocked || lockedEl === el;
    const borderColor = isLockedState ? COLORS.borderLocked : COLORS.border;

    const x = r.x;
    const y = r.y;
    const w = r.width;
    const h = r.height;

    // 外层 margin box
    const bx = x - m.left;
    const by = y - m.top;
    const bw = w + m.left + m.right;
    const bh = h + m.top + m.bottom;

    // 高亮框
    createRect(bx, by, bw, bh, { border: borderColor, bg: COLORS.margin, borderWidth: 1.5 });

    // padding 层
    if (p.top > 0 || p.right > 0 || p.bottom > 0 || p.left > 0) {
      createRect(x, y, w, h, { border: borderColor, bg: COLORS.padding, borderWidth: 1 });
    }

    // content 层
    createRect(x + p.left, y + p.top, w - p.left - p.right, h - p.top - p.bottom, { border: borderColor, bg: COLORS.content, borderWidth: 1 });

    // 角标
    if (isLockedState) {
      createCornerLocked(bx, by, bw, bh);
    } else {
      createCorner(bx, by, bw, bh);
    }

    // 视口边界（画布）
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 4 边距离标尺
    const topDist = y;
    const bottomDist = vh - (y + h);
    const leftDist = x;
    const rightDist = vw - (x + w);

    // Top 标尺
    if (topDist > 0) {
      createLine(x + w / 2, 0, x + w / 2, y, { color: COLORS.guideAlpha });
      createEndTick(x + w / 2, 0, true);
      createEndTick(x + w / 2, y, true);
      createLabel(fmt(topDist), x + w / 2 + 4, topDist / 2 - 8);
    }
    // Bottom 标尺
    if (bottomDist > 0) {
      createLine(x + w / 2, y + h, x + w / 2, vh, { color: COLORS.guideAlpha });
      createEndTick(x + w / 2, y + h, true);
      createEndTick(x + w / 2, vh, true);
      createLabel(fmt(bottomDist), x + w / 2 + 4, y + h + bottomDist / 2 - 8);
    }
    // Left 标尺
    if (leftDist > 0) {
      createLine(0, y + h / 2, x, y + h / 2, { color: COLORS.guideAlpha });
      createEndTick(0, y + h / 2, false);
      createEndTick(x, y + h / 2, false);
      createLabel(fmt(leftDist), leftDist / 2 - 15, y + h / 2 + 4);
    }
    // Right 标尺
    if (rightDist > 0) {
      createLine(x + w, y + h / 2, vw, y + h / 2, { color: COLORS.guideAlpha });
      createEndTick(x + w, y + h / 2, false);
      createEndTick(vw, y + h / 2, false);
      createLabel(fmt(rightDist), x + w + rightDist / 2 - 15, y + h / 2 + 4);
    }

    // 最近兄弟连线
    if (info.nearestSibling) {
      const s = info.nearestSibling;
      const sRect = s.el.getBoundingClientRect();
      const cx = x + w / 2;
      const cy = y + h / 2;
      const scx = sRect.left + sRect.width / 2;
      const scy = sRect.top + sRect.height / 2;
      createLine(cx, cy, scx, scy, { color: COLORS.guide });
      const midX = (cx + scx) / 2;
      const midY = (cy + scy) / 2;
      createLabel(`${fmt(s.dist)}px · ${s.dir} ${s.label}`, midX + 8, midY - 8);
    }

    // 规格信息改由右侧【检查器】展示，页面内不再渲染浮动规格框
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

  // === 构建 Tab 列表 ===
  function buildTabList() {
    const all = [];
    function walk(node) {
      if (node === container || container.contains(node)) return;
      if (node.nodeType !== 1) return;
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.width < vw && rect.height < vh) {
        all.push(node);
      }
      for (const child of node.children) walk(child);
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const child of document.body.children) walk(child);
    // 按文档顺序排序
    return all;
  }

  // === 事件处理 ===
  let viewerMode = 'normal'; // 'inspect' | 'comment' | 'normal'

  function shouldBlockInteraction(target) {
    // inspect 模式：完全禁止业务点击
    if (viewerMode === 'inspect') {
      if (!enabled) return false;
      if (!target) return false;
      if (target === container || container.contains(target)) return false;
      return true;
    }
    // comment 模式：禁止点击跳转，但允许滚动
    if (viewerMode === 'comment') {
      if (!target) return false;
      if (target === container || container.contains(target)) return false;
      return true;
    }
    // normal 模式：完全恢复页面行为
    return false;
  }

  function blockInteractiveEvent(e) {
    if (viewerMode === 'normal') return;
    // inspect 模式下的 click/dblclick 交给后面的锁定 handler 处理。
    // 这里若 stopImmediatePropagation，会把同阶段后续的锁定监听一并掐掉，导致左键无法锁定。
    if (viewerMode === 'inspect' && (e.type === 'click' || e.type === 'dblclick')) {
      return;
    }
    if (!shouldBlockInteraction(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
  }

  // 在捕获阶段拦截页面原始交互
  // inspect 模式：拦截所有交互
  // comment 模式：只拦截点击类，不拦截滚动
  document.addEventListener('click', blockInteractiveEvent, true);
  document.addEventListener('dblclick', blockInteractiveEvent, true);
  document.addEventListener('submit', blockInteractiveEvent, true);

  // inspect 模式额外拦截指针和触摸事件
  // 注意：pointerdown / mousedown / touchstart 不在这里 stopImmediatePropagation，
  // 否则会阻断后续的锁定 handler（同为捕获阶段且注册更晚）。
  function blockPointerEvent(e) {
    if (viewerMode !== 'inspect') return;
    if (!shouldBlockInteraction(e.target)) return;

    // 起始事件交给锁定 handler；这里只拦截 up，避免页面按钮态/拖拽残留
    if (e.type === 'pointerdown' || e.type === 'mousedown' || e.type === 'touchstart') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
  }
  document.addEventListener('pointerdown', blockPointerEvent, true);
  document.addEventListener('pointerup', blockPointerEvent, true);
  document.addEventListener('mousedown', blockPointerEvent, true);
  document.addEventListener('mouseup', blockPointerEvent, true);
  document.addEventListener('touchstart', blockPointerEvent, true);
  document.addEventListener('touchend', blockPointerEvent, true);

  // 鼠标移动
  document.addEventListener('mousemove', function(e) {
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
    if (!enabled) return;

    // 如果已锁定，继续渲染锁定元素（保持绿色锁定状态），不响应 hover
    if (lockedEl) {
      render(lockedEl, true);
      return;
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === container || container.contains(el)) {
      clearAll();
      hoverEl = null;
      clearSelectionPayload();
      return;
    }
    hoverEl = el;
    render(el, false);
  });

  // 鼠标离开文档
  document.addEventListener('mouseleave', function() {
    if (!enabled) return;
    if (!lockedEl) {
      clearAll();
      hoverEl = null;
      clearSelectionPayload();
    }
  });

  // 点击/按下 - 锁定/取消锁定（捕获阶段）
  // 同时监听 pointerdown + click：部分页面在 mousedown 被拦截后 click 行为不稳定
  function handleInspectLock(e) {
    if (!enabled || viewerMode !== 'inspect') return;

    const target = e.target;
    if (target === container || container.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement || el === container || container.contains(el)) {
      // 点击空白处，取消锁定
      if (lockedEl) {
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
      hoverEl = el;
      render(el, true);
    }
  }

  // pointerdown 优先锁定；click 兜底（忽略刚刚 pointerdown 已处理的重复事件）
  let lastLockTs = 0;
  document.addEventListener('pointerdown', function(e) {
    if (!enabled || viewerMode !== 'inspect') return;
    if (e.button != null && e.button !== 0) return; // 仅左键
    lastLockTs = Date.now();
    handleInspectLock(e);
  }, true);

  document.addEventListener('click', function(e) {
    if (!enabled || viewerMode !== 'inspect') return;
    // 若 400ms 内已由 pointerdown 锁定，跳过重复 click
    if (Date.now() - lastLockTs < 400) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      return;
    }
    handleInspectLock(e);
  }, true);


  // 键盘事件
  document.addEventListener('keydown', function(e) {
    if (!enabled) return;

    // Esc - 退出标注
    if (e.key === 'Escape') {
      e.preventDefault();
      // 先取消锁定
      if (lockedEl) {
        lockedEl = null;
        clearAll();
        hoverEl = null;
      }
      clearSelectionPayload();
      // 通知父页面退出标注模式
      window.parent.postMessage({ type: 'prototype-inspector-exit' }, '*');
      return;
    }

    // Tab - 跳转元素
    if (e.key === 'Tab') {
      e.preventDefault();
      if (tabList.length === 0) {
        tabList = buildTabList();
      }
      if (tabList.length === 0) return;

      if (e.shiftKey) {
        tabIndex = tabIndex <= 0 ? tabList.length - 1 : tabIndex - 1;
      } else {
        tabIndex = tabIndex >= tabList.length - 1 ? 0 : tabIndex + 1;
      }

      const el = tabList[tabIndex];
      lockedEl = el;
      render(el, true);

      // 滚动到可见区域
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  });

  // 接收父页面消息
  window.addEventListener('message', function(e) {
    // 新协议：统一模式控制
    if (e.data && e.data.type === 'prototype-viewer-mode') {
      viewerMode = e.data.mode || 'normal';
      if (viewerMode === 'inspect') {
        enabled = true;
        tabList = buildTabList();
      } else {
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

  console.log('[Prototype Inspector v7] 已加载：检查器同步边框与 box-shadow');
})();
