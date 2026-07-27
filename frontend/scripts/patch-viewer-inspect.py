from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")
text = path.read_text(encoding="utf-8")

if "type InspectedElementSpec" not in text:
    text = text.replace(
        "type DeviceMode = 'desktop' | 'mobile' | 'tablet'\n",
        """type DeviceMode = 'desktop' | 'mobile' | 'tablet'

interface InspectedColorInfo {
  hex: string
  rgb: string
  isTransparent?: boolean
}

interface InspectedElementSpec {
  locked: boolean
  label: string
  tagName: string
  size: { width: number; height: number }
  position: { x: number; y: number }
  distances: { top: number; right: number; bottom: number; left: number }
  margin: { top: number; right: number; bottom: number; left: number }
  padding: { top: number; right: number; bottom: number; left: number }
  font: {
    family: string
    size: string
    weight: string
    lineHeight: string
    letterSpacing: string
    textAlign: string
  }
  colors: {
    text: InspectedColorInfo
    background: InspectedColorInfo
    borderTop: InspectedColorInfo
  }
  borderRadius: string
  nearestSibling: { dir: string; label: string; dist: number } | null
}

const fmtPx = (n: number) => `${Math.round(n * 100) / 100}`
""",
    )

if "inspectedElement" not in text:
    text = text.replace(
        "  const [rightCollapsed, setRightCollapsed] = useState(false)\n",
        "  const [rightCollapsed, setRightCollapsed] = useState(false)\n  const [inspectedElement, setInspectedElement] = useState<InspectedElementSpec | null>(null)\n",
    )

old_msg = """  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'prototype-inspector-exit') {
        setInspectMode(false)
        sendInspectorState(false)
        sendViewerMode('normal')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [sendInspectorState, sendViewerMode])
"""

new_msg = """  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'prototype-inspector-exit') {
        setInspectMode(false)
        setInspectedElement(null)
        sendInspectorState(false)
        sendViewerMode('normal')
        return
      }

      if (data.type === 'prototype-inspector-selection') {
        if (data.cleared) {
          setInspectedElement(null)
          return
        }
        setInspectedElement({
          locked: !!data.locked,
          label: data.label || '未命名元素',
          tagName: data.tagName || '',
          size: data.size || { width: 0, height: 0 },
          position: data.position || { x: 0, y: 0 },
          distances: data.distances || { top: 0, right: 0, bottom: 0, left: 0 },
          margin: data.margin || { top: 0, right: 0, bottom: 0, left: 0 },
          padding: data.padding || { top: 0, right: 0, bottom: 0, left: 0 },
          font: data.font || {
            family: '-',
            size: '-',
            weight: '-',
            lineHeight: '-',
            letterSpacing: '-',
            textAlign: '-',
          },
          colors: data.colors || {
            text: { hex: '-', rgb: '-' },
            background: { hex: '-', rgb: '-' },
            borderTop: { hex: '-', rgb: '-' },
          },
          borderRadius: data.borderRadius || '0px',
          nearestSibling: data.nearestSibling || null,
        })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [sendInspectorState, sendViewerMode])
"""

if old_msg not in text:
    raise SystemExit('message effect not found')
text = text.replace(old_msg, new_msg, 1)

old_toggle = """  const toggleInspect = () => {
    const next = !inspectMode
    setInspectMode(next)
    sendInspectorState(next)
    if (next) {
      setCommentMode(false)
      setNewMarkerDraft(null)
      sendViewerMode('inspect')
    } else {
      sendViewerMode('normal')
    }
  }
"""
new_toggle = """  const toggleInspect = () => {
    const next = !inspectMode
    setInspectMode(next)
    sendInspectorState(next)
    if (next) {
      setCommentMode(false)
      setNewMarkerDraft(null)
      sendViewerMode('inspect')
    } else {
      setInspectedElement(null)
      sendViewerMode('normal')
    }
  }
"""
if old_toggle not in text:
    raise SystemExit('toggleInspect not found')
text = text.replace(old_toggle, new_toggle, 1)

text = text.replace(
    """    if (next) {
      setInspectMode(false)
      sendInspectorState(false)
      setActiveMarkerId(null)
      sendViewerMode('comment')
    } else {
""",
    """    if (next) {
      setInspectMode(false)
      setInspectedElement(null)
      sendInspectorState(false)
      setActiveMarkerId(null)
      sendViewerMode('comment')
    } else {
""",
    1,
)

old_left = """  const leftSidebar = (
    <div className=\"pv-left\">
      <div className=\"pv-sidebar-group\">
        <div className=\"pv-sidebar-label\">工作台</div>
        <NavTree />
      </div>

      <div className=\"pv-sidebar-group\">
        <div className=\"pv-sidebar-label\">原型内页面</div>
        <div className=\"pv-page-list\">
          {viewerFile.pages.map((page) => {
            const isActive = page.id === activePage?.id
            const count = pageCommentCount(page.id)
            return (
              <button
                key={page.id}
                type=\"button\"
                className={`pv-page-item${isActive ? ' is-active' : ''}`}
                onClick={() => switchPage(page.id)}
              >
                <div className=\"pv-page-name\">{page.name}</div>
                <div className=\"pv-page-row-meta\">
                  <span>{page.path}</span>
                  <span>{isActive ? '当前' : `评论 ${count}`}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className=\"pv-sidebar-group\">
        <div className=\"pv-sidebar-label\">本轮评审</div>
        <div className=\"pv-sidebar-note\">
          <strong>本轮评审重点</strong>
          <p>
            确认首页首屏活动区、频道入口和推荐流的层级关系，同时校对按钮位置与标注规格。当前预览页：
            {activePage?.name ?? '—'}。
          </p>
        </div>
      </div>
    </div>
  )
"""

new_left = """  const leftSidebar = (
    <div className=\"pv-left\">
      <div className=\"pv-sidebar-group\">
        <NavTree sections={['workbench']} />
      </div>

      <div className=\"pv-sidebar-group\">
        <div className=\"pv-sidebar-label\">原型内页面</div>
        <div className=\"pv-page-list\">
          {viewerFile.pages.map((page) => {
            const isActive = page.id === activePage?.id
            const count = pageCommentCount(page.id)
            return (
              <button
                key={page.id}
                type=\"button\"
                className={`pv-page-item${isActive ? ' is-active' : ''}`}
                onClick={() => switchPage(page.id)}
              >
                <div className=\"pv-page-name\">{page.name}</div>
                <div className=\"pv-page-row-meta\">
                  <span>{page.path}</span>
                  <span>{isActive ? '当前' : `评论 ${count}`}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className=\"pv-sidebar-group\">
        <NavTree sections={['favorites']} />
      </div>

      <div className=\"pv-sidebar-group\">
        <div className=\"pv-sidebar-label\">本轮评审</div>
        <div className=\"pv-sidebar-note\">
          <strong>本轮评审重点</strong>
          <p>
            确认首页首屏活动区、频道入口和推荐流的层级关系，同时校对按钮位置与标注规格。当前预览页：
            {activePage?.name ?? '—'}。
          </p>
        </div>
      </div>
    </div>
  )
"""

if old_left not in text:
    raise SystemExit('left sidebar not found')
text = text.replace(old_left, new_left, 1)

# Replace right inspect panel by markers
start = text.find("      {inspectMode ? (")
end = text.find("      <div className=\"pv-right-section\">\n        <div className=\"pv-sidebar-label\">评论面板</div>")
if start < 0 or end < 0:
    raise SystemExit(f'right panel markers not found start={start} end={end}')

new_right = '''      {inspectMode ? (
        <div className="pv-right-section">
          <div className="pv-sidebar-label">检查器</div>
          <h3 className="pv-right-heading">
            {inspectedElement
              ? `当前选中：${inspectedElement.label}`
              : '点击预览中的元素以锁定并查看规格'}
          </h3>

          {inspectedElement ? (
            <>
              <div className="pv-panel-card">
                <strong>基础规格</strong>
                <div className="pv-inspector-row">
                  <span>标签</span>
                  <strong>
                    {inspectedElement.tagName || '-'}
                    {inspectedElement.locked ? ' · 已锁定' : ' · 悬停中'}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>尺寸</span>
                  <strong>
                    {fmtPx(inspectedElement.size.width)} × {fmtPx(inspectedElement.size.height)}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>位置 X, Y</span>
                  <strong>
                    {fmtPx(inspectedElement.position.x)}, {fmtPx(inspectedElement.position.y)}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>圆角</span>
                  <strong>{inspectedElement.borderRadius}</strong>
                </div>
              </div>

              <div className="pv-panel-card">
                <strong>距画布</strong>
                <div className="pv-spec-grid">
                  <span className="pv-spec-chip">↑ {fmtPx(inspectedElement.distances.top)}</span>
                  <span className="pv-spec-chip">↓ {fmtPx(inspectedElement.distances.bottom)}</span>
                  <span className="pv-spec-chip">← {fmtPx(inspectedElement.distances.left)}</span>
                  <span className="pv-spec-chip">→ {fmtPx(inspectedElement.distances.right)}</span>
                </div>
              </div>

              <div className="pv-panel-card">
                <strong>字体</strong>
                <div className="pv-inspector-row">
                  <span>Family</span>
                  <strong>{inspectedElement.font.family}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Size</span>
                  <strong>{inspectedElement.font.size}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Weight</span>
                  <strong>{inspectedElement.font.weight}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Line Height</span>
                  <strong>{inspectedElement.font.lineHeight}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Letter Spacing</span>
                  <strong>{inspectedElement.font.letterSpacing}</strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Align</span>
                  <strong>{inspectedElement.font.textAlign}</strong>
                </div>
              </div>

              <div className="pv-panel-card">
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

              <div className="pv-panel-card">
                <strong>间距</strong>
                <div className="pv-inspector-row">
                  <span>Margin</span>
                  <strong>
                    {fmtPx(inspectedElement.margin.top)} / {fmtPx(inspectedElement.margin.right)} /{' '}
                    {fmtPx(inspectedElement.margin.bottom)} / {fmtPx(inspectedElement.margin.left)}
                  </strong>
                </div>
                <div className="pv-inspector-row">
                  <span>Padding</span>
                  <strong>
                    {fmtPx(inspectedElement.padding.top)} / {fmtPx(inspectedElement.padding.right)} /{' '}
                    {fmtPx(inspectedElement.padding.bottom)} / {fmtPx(inspectedElement.padding.left)}
                  </strong>
                </div>
              </div>

              {inspectedElement.nearestSibling ? (
                <div className="pv-panel-card">
                  <strong>最近兄弟</strong>
                  <div className="pv-inspector-row">
                    <span>方向</span>
                    <strong>{inspectedElement.nearestSibling.dir}</strong>
                  </div>
                  <div className="pv-inspector-row">
                    <span>元素</span>
                    <strong>{inspectedElement.nearestSibling.label}</strong>
                  </div>
                  <div className="pv-inspector-row">
                    <span>距离</span>
                    <strong>{fmtPx(inspectedElement.nearestSibling.dist)} px</strong>
                  </div>
                </div>
              ) : null}

              <div className="pv-panel-card">
                <strong>操作提示</strong>
                <p className="pv-panel-text">
                  左键点击元素锁定 / 再点取消锁定。Tab 跳转下一个，Esc 退出实时标注。规格只显示在本检查器中。
                </p>
              </div>
            </>
          ) : (
            <div className="pv-panel-card">
              <strong>等待选择</strong>
              <p className="pv-panel-text">
                在预览区移动鼠标可高亮元素，左键点击后锁定该元素，并在此处展示完整规格。
              </p>
              <div className="pv-inspector-row">
                <span>当前页</span>
                <strong>{activePage?.name ?? '—'}</strong>
              </div>
              <div className="pv-inspector-row">
                <span>缩放</span>
                <strong>{zoomLevel}%</strong>
              </div>
            </div>
          )}
        </div>
      ) : null}

'''

text = text[:start] + new_right + text[end:]

text = text.replace(
    """  const switchPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId)
    setActiveMarkerId(null)
    setNewMarkerDraft(null)
  }, [])
""",
    """  const switchPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId)
    setActiveMarkerId(null)
    setNewMarkerDraft(null)
    setInspectedElement(null)
  }, [])
""",
    1,
)

path.write_text(text, encoding='utf-8')
print('PrototypeViewerPage patched ok')
