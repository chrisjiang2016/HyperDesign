import { useEffect, useRef, useState } from 'react'
import { Button, Select } from 'antd'
import { LeftOutlined, MinusOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { getPublicSharePreview, publicShareResourceUrl, type PublicSharePreview } from '@/api/workspace'
import './public-preview.css'

/** Deliberately independent of the authenticated viewer, workspace and comments. */
export function PublicPrototypeViewerPage({ token }: { token: string }) {
  const [preview, setPreview] = useState<PublicSharePreview | null>(null)
  const [pageId, setPageId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const iframe = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let active = true
    let poll: ReturnType<typeof setTimeout> | undefined
    let expiry: ReturnType<typeof setTimeout> | undefined
    let deadline = 0
    let checking = false
    const clearPreview = () => {
      if (iframe.current) iframe.current.src = 'about:blank'
      setPreview(null)
    }
    const fail = () => {
      clearTimeout(poll)
      clearTimeout(expiry)
      clearPreview()
      setError(true)
    }
    const scheduleExpiry = () => {
      clearTimeout(expiry)
      const remaining = deadline - performance.now()
      if (remaining <= 0) { fail(); return }
      // Browser timers overflow above ~24.8 days; links can last 30 days.
      expiry = setTimeout(scheduleExpiry, Math.min(remaining, 60000))
    }
    const verify = async () => {
      if (checking || !active) return
      checking = true
      const started = performance.now()
      try {
        const data = await getPublicSharePreview(token)
        if (!active) return
        const remaining = Date.parse(data.expiresAt) - Date.parse(data.serverTime) - (performance.now() - started)
        if (!Number.isFinite(remaining) || remaining <= 0) { fail(); return }
        deadline = performance.now() + remaining
        scheduleExpiry()
        setPreview(data)
        setError(false)
        setPageId((current) => data.pages.some((page) => page.id === current) ? current : data.entryPageId ?? data.pages[0]?.id ?? null)
        clearTimeout(poll)
        poll = setTimeout(() => void verify(), Math.min(15000, remaining))
      } catch {
        if (active) fail() // Fail closed, including connectivity loss.
      } finally {
        checking = false
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearPreview() // Do not keep a stale iframe while resuming a background tab.
        if (deadline && performance.now() >= deadline) fail()
        else void verify()
      }
    }
    setError(false)
    clearPreview()
    void verify()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      clearTimeout(poll)
      clearTimeout(expiry)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [token, retry])

  const index = preview?.pages.findIndex((page) => page.id === pageId) ?? -1
  const page = preview?.pages[index]
  return (
    <main className="public-preview">
      <header className="public-preview__header">
        <div><span className="public-preview__brand">HyperDesign / 原型分享</span><h1>{preview?.name ?? '原型预览'}</h1></div>
        <span className="public-preview__badge">免登录 · 仅查看</span>
      </header>
      {error ? (
        <section className="public-preview__state" role="alert">
          <h2>无法继续查看此原型</h2><p>链接无效、已到期、已撤销，或暂时无法验证。已停止预览。</p>
          <Button onClick={() => setRetry((value) => value + 1)}>重新验证</Button>
        </section>
      ) : !preview ? <section className="public-preview__state" role="status">正在验证分享链接…</section> : (
        <>
          <nav className="public-preview__toolbar" aria-label="原型页面和缩放">
            <Button aria-label="上一页" disabled={index <= 0} onClick={() => setPageId(preview.pages[index - 1].id)}><LeftOutlined /></Button>
            <Select aria-label="选择原型页面" value={pageId} onChange={setPageId} options={preview.pages.map((item) => ({ value: item.id, label: item.title || item.relativePath }))} style={{ width: 240, maxWidth: '40vw' }} />
            <Button aria-label="下一页" disabled={index < 0 || index >= preview.pages.length - 1} onClick={() => setPageId(preview.pages[index + 1].id)}><RightOutlined /></Button>
            <span>{index + 1} / {preview.pages.length}</span>
            <div className="public-preview__zoom">
              <Button aria-label="缩小" disabled={zoom <= 50} onClick={() => setZoom((value) => value - 10)}><MinusOutlined /></Button>
              <Button aria-label="重置缩放" onClick={() => setZoom(100)}>{zoom}%</Button>
              <Button aria-label="放大" disabled={zoom >= 150} onClick={() => setZoom((value) => value + 10)}><PlusOutlined /></Button>
            </div>
          </nav>
          <div className="public-preview__canvas">
            {page ? <div className="public-preview__frame" style={{ width: `${zoom}%`, height: `${zoom}%`, minHeight: 600 * zoom / 100 }}>
              <iframe ref={iframe} key={`${token}:${page.id}`} title={page.title || '分享原型'} src={publicShareResourceUrl(token, page.relativePath)} sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: `${10000 / zoom}%`, height: `${10000 / zoom}%`, transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }} />
            </div> : <div className="public-preview__state">没有可预览的页面</div>}
          </div>
          <footer className="public-preview__footer">仅分享此原型，不含评论、标注、编辑或源文件下载 · 有效至 {new Date(preview.expiresAt).toLocaleString('zh-CN', { hour12: false })}</footer>
        </>
      )}
    </main>
  )
}
