from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\public\prototype-assets\inspector.js")
text = path.read_text(encoding="utf-8")

old_block = """  function blockInteractiveEvent(e) {
    if (viewerMode === 'normal') return;
    if (!shouldBlockInteraction(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
  }
"""

new_block = """  function blockInteractiveEvent(e) {
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
"""

if old_block not in text:
    raise SystemExit("blockInteractiveEvent not found")
text = text.replace(old_block, new_block, 1)

# Strengthen lock handler: also respond to pointerdown as primary lock path (more reliable than click after preventDefault chains)
old_lock = """  // 点击 - 锁定/取消锁定（使用捕获阶段，避免业务 click 先执行）
  document.addEventListener('click', function(e) {
    if (!enabled) return;

    const target = e.target;
    if (target === container || container.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement || el === container) {
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
      render(el, true);
    }
  }, true);
"""

new_lock = """  // 点击/按下 - 锁定/取消锁定（捕获阶段）
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
"""

if old_lock not in text:
    raise SystemExit("lock click handler not found")
text = text.replace(old_lock, new_lock, 1)

# blockPointerEvent currently blocks pointerdown in inspect mode BEFORE our lock handler
# Registration order: blockPointerEvent for pointerdown is registered earlier than our new pointerdown lock
# Need to either skip pointerdown in blockPointerEvent or register lock first.
# Fix blockPointerEvent to not block pointerdown (lock handler will block it)

old_ptr = """  // inspect 模式额外拦截指针和触摸事件
  function blockPointerEvent(e) {
    if (viewerMode === 'inspect' && shouldBlockInteraction(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }
  }
  document.addEventListener('pointerdown', blockPointerEvent, true);
  document.addEventListener('pointerup', blockPointerEvent, true);
  document.addEventListener('mousedown', blockPointerEvent, true);
  document.addEventListener('mouseup', blockPointerEvent, true);
  document.addEventListener('touchstart', blockPointerEvent, true);
  document.addEventListener('touchend', blockPointerEvent, true);
"""

new_ptr = """  // inspect 模式额外拦截指针和触摸事件
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
"""

if old_ptr not in text:
    raise SystemExit("blockPointerEvent block not found")
text = text.replace(old_ptr, new_ptr, 1)

# bump log
text = text.replace(
    "console.log('[Prototype Inspector v5] 已加载：锁定后规格同步到右侧检查器，无页面浮动规格框');",
    "console.log('[Prototype Inspector v6] 已加载：修复左键锁定（避免 capture stopImmediatePropagation 阻断）');",
)

path.write_text(text, encoding="utf-8")
print("inspector lock click fixed")
