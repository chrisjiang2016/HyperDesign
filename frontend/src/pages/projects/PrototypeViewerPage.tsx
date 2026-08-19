import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, App as AntdApp, Modal, Select } from 'antd'
import { CommentOutlined, ExportOutlined, LeftOutlined, MinusOutlined, PlusOutlined, RightOutlined, ShareAltOutlined, ToolOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ViewerShellLayout } from '@/layouts/AppLayouts'
import { NavTree } from '@/components/navigation/NavTree'
import { PageEmpty, PageError, PageLoading } from '@/components/common/pagestates'
import { createAnnotationComment, createFileAnnotation, createFileShareLink, getFileAnnotations, getFileShareLinks, getFirstPreview, getNavTeamsProjects, getProjectDetail, getProjectFiles, getPrototypePages, revokeFileShareLink, type CollaborationAnnotation, type FilePermission, type NavTeam, type ProjectDetail, type PrototypePage, type ShareLink } from '@/api/workspace'
import type { ViewerMarker, ViewerComment, ViewerAnnotationPayload } from '@/store/viewerMockData'

const { TextArea } = Input

type DeviceMode = 'desktop' | 'mobile' | 'tablet'

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

const fmtPx = (n: number) => `${Math.round(n * 100) / 100}`


export function PrototypeViewerPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const { fileId } = useParams()
  const [searchParams] = useSearchParams()

  const [inspectMode, setInspectMode] = useState(false)
  const [commentMode, setCommentMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [commentDraft, setCommentDraft] = useState('')
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null)
  const [iframeSize, setIframeSize] = useState({ width: 0, height: 0 })
  const [newMarkerDraft, setNewMarkerDraft] = useState<{ topPercent: number; leftPercent: number; pageScrollTop: number; pageScrollHeight: number } | null>(null)
  const [persistedMarkers, setPersistedMarkers] = useState<ViewerMarker[]>([])
  const [persistedComments, setPersistedComments] = useState<ViewerComment[]>([])
  const [annotationsLoading, setAnnotationsLoading] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [creatingShare, setCreatingShare] = useState(false)
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null)
  const [shareDays, setShareDays] = useState(7)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)
  const [inspectedElement, setInspectedElement] = useState<InspectedElementSpec | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const frameShellRef = useRef<HTMLDivElement>(null)

  const sendViewerMode = useCallback((mode: 'inspect' | 'comment' | 'normal') => {
    try {
      const iframe = iframeRef.current
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'prototype-viewer-mode', mode }, '*')
      }
    } catch {
      // ignore cross-origin
    }
  }, [])

  const sendInspectorState = useCallback((enabled: boolean) => {
    try {
      const iframe = iframeRef.current
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'prototype-inspector', enabled }, '*')
      }
    } catch {
      // ignore cross-origin
    }
  }, [])

  const [apiProject, setApiProject] = useState<ProjectDetail | null>(null)
  // Keep the route target independently from the project detail request. This
  // makes the back button reliable even while the detail panel is refreshing.
  const [viewerProjectId, setViewerProjectId] = useState<string | null>(null)
  const [apiPages, setApiPages] = useState<PrototypePage[]>([])
  const [navTeams, setNavTeams] = useState<NavTeam[]>([])
  const [projectFiles, setProjectFiles] = useState<Array<{ id: string; name: string; pageCount: number; entryPageId: string | null }>>([])
  const [filePermission, setFilePermission] = useState<FilePermission | null>(null)
  const [viewerLoading, setViewerLoading] = useState(true)
  const [viewerLoadError, setViewerLoadError] = useState<string | null>(null)

  const loadViewer = useCallback(async () => {
    setViewerLoading(true)
    setViewerLoadError(null)
    try {
      if (!fileId) throw new Error('缺少原型文件 ID')
      // pages + permissions 是 Viewer 的最小可用契约；分享只读用户可能没有项目成员权限。
      const pageData = await getPrototypePages(fileId)
      setApiPages(pageData.pages)
      setFilePermission(pageData.permissions)
      setViewerProjectId(pageData.projectId)

      // 项目详情 / 项目文件列表属于协作导航增强能力，失败时降级为只读预览。
      const teams = await getNavTeamsProjects().catch(() => [] as NavTeam[])
      setNavTeams(teams)

      const currentProjectId = pageData.projectId
      if (!currentProjectId) {
        setApiProject(null)
        setProjectFiles([{ id: fileId, name: '分享原型', pageCount: pageData.pages.length, entryPageId: pageData.entryPageId }])
        return
      }

      try {
        const [detail, files] = await Promise.all([getProjectDetail(currentProjectId), getProjectFiles(currentProjectId)])
        setApiProject(detail)
        const matched = files.find((file) => file.id === fileId)
        setProjectFiles(
          matched
            ? files
            : [
                ...files,
                {
                  id: fileId,
                  name: detail.name ? `${detail.name} · 分享原型` : '分享原型',
                  pageCount: pageData.pages.length,
                  entryPageId: pageData.entryPageId,
                },
              ],
        )
      } catch {
        // 分享接受者只有文件级只读 grant，项目接口 403/404 是预期情况。
        setApiProject(null)
        setProjectFiles([
          {
            id: fileId,
            name: '分享原型',
            pageCount: pageData.pages.length,
            entryPageId: pageData.entryPageId,
          },
        ])
      }
    } catch {
      setApiProject(null)
      setViewerProjectId(null)
      setApiPages([])
      setFilePermission(null)
      setNavTeams([])
      setProjectFiles([])
      setViewerLoadError('原型文件不存在，或你没有访问权限。')
    } finally {
      setViewerLoading(false)
    }
  }, [fileId])

  useEffect(() => { void loadViewer() }, [loadViewer])

  const viewerFile = {
    id: fileId ?? '',
    title: projectFiles.find((file) => file.id === fileId)?.name ?? '原型文件',
    subtitle: '真实项目原型',
    pageCount: apiPages.length,
    pages: apiPages.map((page) => ({ id: page.id, name: page.title || page.relativePath, path: page.relativePath, previewPath: page.relativePath, isCurrent: page.isEntry })),
    markers: [] as ViewerMarker[],
    comments: [] as ViewerComment[],
  }
  const project = apiProject
  const projectTeam = useMemo(
    () => {
      const team = navTeams.find((item) => item.id === project?.teamId)
      return { name: team?.name ?? '团队' }
    },
    [navTeams, project?.teamId],
  )
  // 项目切换器只展示：当前用户所在团队 + 当前用户有查看或编辑权限的项目。
  // 未在权限映射中出现的项目按无权限处理，不渲染到下拉列表。
  const switchableProjects = useMemo(
    () =>
      navTeams.find((item) => item.id === project?.teamId)?.projects.map((item) => ({ ...item, fileCount: item.id === project?.id ? projectFiles.length : 0 })) ?? [],
    [navTeams, project?.teamId, project?.id, projectFiles.length],
  )
  const currentTeamProject = useMemo(
    () => switchableProjects.find((item) => item.id === project?.id),
    [project?.id, switchableProjects],
  )
  const canComment = filePermission?.canComment ?? false
  const canManageShares = filePermission?.canEdit ?? false

  const loadShareLinks = useCallback(async () => {
    if (!fileId) return
    setShareLoading(true)
    try {
      setShareLinks(await getFileShareLinks(fileId))
    } catch {
      message.error('无法加载分享链接')
    } finally {
      setShareLoading(false)
    }
  }, [fileId, message])

  const openShareManager = () => {
    setShareOpen(true)
    void loadShareLinks()
  }

  useEffect(() => {
    if (searchParams.get('share') === 'manage' && canManageShares) openShareManager()
  }, [canManageShares, searchParams])

  const buildShareUrl = (token: string) => `${window.location.origin}/shares/${token}`

  const copyShareUrl = async (url: string) => {
    try {
      // 部分浏览器/无焦点场景下 clipboard API 可能挂起，避免阻塞分享创建主流程
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('clipboard timeout')), 1500)),
      ])
      message.success('分享链接已复制')
    } catch {
      message.info(`请复制链接：${url}`)
    }
  }

  const createShare = async () => {
    if (!fileId) return
    setCreatingShare(true)
    try {
      const link = await createFileShareLink(fileId, shareDays)
      await copyShareUrl(buildShareUrl(link.token))
      await loadShareLinks()
    } catch {
      message.error('创建分享链接失败')
    } finally {
      setCreatingShare(false)
    }
  }

  const revokeShare = async (shareId: string) => {
    if (!fileId) return
    setRevokingShareId(shareId)
    try {
      await revokeFileShareLink(fileId, shareId)
      await loadShareLinks()
      message.success('分享链接已撤销')
    } catch {
      message.error('撤销分享链接失败')
    } finally {
      setRevokingShareId(null)
    }
  }

  const activePage = useMemo(() => {
    const requestedPageId = searchParams.get('page')
    const initialPageId =
      currentPageId ?? requestedPageId ?? viewerFile.pages.find((page) => page.isCurrent)?.id ?? viewerFile.pages[0]?.id
    return viewerFile.pages.find((page) => page.id === initialPageId) ?? viewerFile.pages[0]
  }, [currentPageId, searchParams, viewerFile.pages])

  const activePreviewUrl = activePage
    ? `/api/preview/files/${fileId}/${encodeURI(activePage.previewPath ?? activePage.path)}`
    : undefined

  const loadPageAnnotations = useCallback(async (pageId: string) => {
    if (!fileId) return
    setAnnotationsLoading(true)
    try {
      const annotations = await getFileAnnotations(fileId, pageId)
      setPersistedMarkers(annotations.map((item: CollaborationAnnotation) => ({
        id: item.id,
        number: item.number,
        pageId: item.pageId,
        commentId: item.comments[0]?.id ?? item.id,
        topPercent: item.topPercent,
        leftPercent: item.leftPercent,
        pageScrollTop: (item as any).pageScrollTop ?? 0,
        pageScrollHeight: (item as any).pageScrollHeight ?? 0,
        title: item.title,
        note: item.comments[0]?.content ?? '',
      })))
      setPersistedComments(annotations.flatMap((item: CollaborationAnnotation) => item.comments.map((comment) => ({
        id: comment.id,
        pageId: item.pageId,
        markerId: item.id,
        author: comment.author,
        avatar: comment.author.slice(0, 1) || '我',
        time: new Date(comment.createdAt).toLocaleString('zh-CN', { hour12: false }),
        anchor: `锚点 #${item.number}`,
        content: comment.content,
        actions: ['回复'],
        replies: (comment.replies ?? []).map((reply) => ({ id: reply.id, commentId: comment.id, author: reply.author, content: reply.content })),
      }))))
    } catch {
      message.error('无法加载当前页面的标注评论')
      setPersistedMarkers([])
      setPersistedComments([])
    } finally {
      setAnnotationsLoading(false)
    }
  }, [fileId, message])

  useEffect(() => {
    if (activePage?.id) void loadPageAnnotations(activePage.id)
  }, [activePage?.id, loadPageAnnotations])

  const activeMarkers = useMemo(() => {
    if (!activePage) return []
    const originalMarkers = [...viewerFile.markers, ...persistedMarkers].filter((marker) => marker.pageId === activePage.id)
    return originalMarkers
  }, [activePage, viewerFile.markers, persistedMarkers])

  const activeComments = useMemo(() => {
    if (!activePage) return []
    const markerIds = new Set(activeMarkers.map((marker) => marker.id))
    const originalComments = [...viewerFile.comments, ...persistedComments].filter(
      (comment) => comment.pageId === activePage.id && markerIds.has(comment.markerId),
    )
    return originalComments
  }, [activePage, activeMarkers, viewerFile.comments, persistedComments])

  const activeMarker = useMemo(() => {
    if (activeMarkerId == null) return null
    return activeMarkers.find((marker) => marker.id === activeMarkerId) ?? null
  }, [activeMarkerId, activeMarkers])


  const pageCommentCount = useCallback(
    (pageId: string) => {
      const pageMarkers = [...viewerFile.markers, ...persistedMarkers].filter((m) => m.pageId === pageId)
      const markerIds = new Set(pageMarkers.map((m) => m.id))
      return [...viewerFile.comments, ...persistedComments].filter(
        (c) => c.pageId === pageId && markerIds.has(c.markerId),
      ).length
    },
    [viewerFile.markers, viewerFile.comments, persistedMarkers, persistedComments],
  )

  const frameUrl = activePreviewUrl ?? '未加载预览资源'

  useEffect(() => {
    const updateSize = () => {
      const shell = frameShellRef.current
      if (!shell) return
      const { clientWidth: width, clientHeight: height } = shell
      setIframeSize((current) => (
        current.width === width && current.height === height
          ? current
          : { ...current, width, height }
      ))
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [activePage?.id, deviceMode, zoomLevel])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument
        const iframeWin = iframe.contentWindow
        if (!iframeDoc || !iframeWin) return

        const updateScroll = () => {
          const body = iframeDoc.body || iframeDoc.documentElement
          setIframeSize((prev) => ({
            ...prev,
            scrollTop: body.scrollTop,
            scrollHeight: body.scrollHeight,
            clientHeight: iframeWin.innerHeight ?? body.clientHeight,
          }))
        }

        iframeDoc.addEventListener('scroll', updateScroll, true)
        iframeWin.addEventListener('resize', updateScroll)
        updateScroll()

        return () => {
          iframeDoc.removeEventListener('scroll', updateScroll, true)
          iframeWin.removeEventListener('resize', updateScroll)
        }
      } catch {
        // cross-origin
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [activePreviewUrl])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only the currently rendered, same-origin prototype iframe may update
      // Viewer inspector state. Ignore arbitrary windows that can otherwise
      // send postMessage payloads to this page.
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== window.location.origin) return
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
        })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [sendInspectorState, sendViewerMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectMode) {
        setInspectMode(false)
        sendInspectorState(false)
        sendViewerMode('normal')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inspectMode, sendInspectorState, sendViewerMode])

  const scaleStyle = {
    transform: `scale(${zoomLevel / 100})`,
    transformOrigin: 'top center',
  }

  const frameClassName = `pv-frame-shell pv-frame-shell--${deviceMode}`

  const toggleInspect = () => {
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

  const toggleCommentMode = () => {
    const next = !commentMode
    setCommentMode(next)
    if (next) {
      setInspectMode(false)
      setInspectedElement(null)
      sendInspectorState(false)
      setActiveMarkerId(null)
      sendViewerMode('comment')
    } else {
      setNewMarkerDraft(null)
      sendViewerMode('normal')
    }
  }

  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 200))
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 60))

  const handleBackToProject = useCallback(() => {
    const targetProjectId = project?.id ?? viewerProjectId
    if (targetProjectId) {
      navigate(`/projects/${targetProjectId}`)
      return
    }
    navigate('/')
  }, [navigate, project?.id, viewerProjectId])

  const addComment = async () => {
    const content = commentDraft.trim()
    if (!content || !fileId) return
    if (!canComment) { message.warning('当前账号没有该原型的评论权限'); return }

    setSubmittingComment(true)
    try {
      if (newMarkerDraft && activePage) {
        const annotation = await createFileAnnotation(fileId, activePage.id, {
          title: `标注 · ${activePage.name}`,
          content,
          topPercent: newMarkerDraft.topPercent,
          leftPercent: newMarkerDraft.leftPercent,
          pageScrollTop: newMarkerDraft.pageScrollTop,
          pageScrollHeight: newMarkerDraft.pageScrollHeight,
        })
        await loadPageAnnotations(activePage.id)
        setActiveMarkerId(annotation.id)
        setNewMarkerDraft(null)
        setCommentDraft('')
        message.success(`标注 #${annotation.number} 已保存`)
      } else if (activeMarker) {
        await createAnnotationComment(fileId, activeMarker.id, { content, parentId: activeMarker.commentId })
        if (activePage) await loadPageAnnotations(activePage.id)
        setCommentDraft('')
        message.success('回复已保存')
      } else {
        message.warning('请先在评论模式下点击页面创建标注，或选择已有标注进行回复')
      }
    } catch {
      message.error('保存评论失败，请稍后重试')
    } finally {
      setSubmittingComment(false)
    }
  }

  const switchPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId)
    setActiveMarkerId(null)
    setNewMarkerDraft(null)
    setInspectedElement(null)
  }, [])

  const handleMarkerSelect = useCallback((markerId: string) => {
    setActiveMarkerId((prev) => (prev === markerId ? null : markerId))
  }, [])

  // reserved for backend persistence
  // @ts-expect-error reserved helper
  const buildAnnotationPayload = useCallback(
    (marker: ViewerMarker, comment: ViewerComment | null): ViewerAnnotationPayload | null => {
      if (!activePage || !comment) return null
      return {
        fileId: viewerFile.id,
        pageId: activePage.id,
        marker: {
          id: marker.id,
          number: marker.number,
          title: marker.title,
          note: marker.note,
          position: {
            topPercent: marker.topPercent,
            leftPercent: marker.leftPercent,
          },
        },
        comment: {
          id: comment.id,
          author: comment.author,
          avatar: comment.avatar,
          time: comment.time,
          anchor: comment.anchor,
          content: comment.content,
          actions: comment.actions,
        },
        replies: (comment.replies || []).map((reply) => ({
          id: reply.id,
          commentId: reply.commentId,
          author: reply.author,
          content: reply.content,
        })),
      }
    },
    [activePage, viewerFile.id],
  )

  const getMarkerPosition = useCallback(
    (marker: ViewerMarker) => {
      const currentScrollTop = (iframeSize as unknown as Record<string, number>).scrollTop ?? 0
      const currentScrollHeight = (iframeSize as unknown as Record<string, number>).scrollHeight ?? iframeSize.height
      const currentClientHeight = (iframeSize as unknown as Record<string, number>).clientHeight ?? iframeSize.height

      // Use the scroll snapshot stored at annotation time to compute the
      // marker’s absolute position in the full document, then translate that
      // into the current visible viewport.
      const storedScrollTop = marker.pageScrollTop || 0
      const storedScrollHeight = marker.pageScrollHeight || currentScrollHeight

      if (storedScrollHeight > currentClientHeight && storedScrollHeight > 0) {
        // Absolute document position (as % of full document height)
        const absoluteTopPercent = marker.topPercent + (storedScrollTop / storedScrollHeight) * 100
        // Translate to current viewport
        const viewportTop = absoluteTopPercent - (currentScrollTop / currentScrollHeight) * 100
        if (viewportTop < -2 || viewportTop > 102) return null
        return { top: Math.max(-2, Math.min(102, viewportTop)), left: marker.leftPercent }
      }
      return { top: marker.topPercent, left: marker.leftPercent }
    },
    [iframeSize],
  )

  const modeLabel = inspectMode ? '规格面板已开启' : commentMode ? '评论模式中' : '浏览模式'

  const handleCommentCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!commentMode) return

    // Use the overlay bounds rather than the outer frame: the latter also includes
    // the browser chrome, shell padding and potentially a CSS zoom transform.
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    event.preventDefault()
    const leftPercent = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
    const topPercent = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))

    // Capture page-level scroll metrics at annotation time.
    // pageScrollTop / pageScrollHeight encode where the visible viewport sits
    // within the full prototype document, so we can reconstruct the absolute
    // vertical position even after resize or scroll change.
    const scrollTop = (iframeSize as unknown as Record<string, number>).scrollTop ?? 0
    const scrollHeight = (iframeSize as unknown as Record<string, number>).scrollHeight ?? iframeSize.height

    setNewMarkerDraft({ topPercent, leftPercent, pageScrollTop: scrollTop, pageScrollHeight: scrollHeight })
    setActiveMarkerId(null)
    message.info(`标注位置已选定：${Math.round(leftPercent)}%, ${Math.round(topPercent)}%，请在右侧输入评论并发送`)
  }, [commentMode, message])

  const viewerTopbar = (
    <header className="pv-topbar">
      <div className="pv-topbar__left">
        <button
          type="button"
          className="pv-brand-back"
          data-testid="viewer-back-to-project"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            handleBackToProject()
          }}
          aria-label="返回项目"
        >
          <LeftOutlined />
          <span className="pv-brand-back__text">返回项目</span>
        </button>
        <div>
          <div className="pv-title">{viewerFile.title}</div>
          <div className="pv-meta">
            <span className="pv-meta-pill">{viewerFile.pageCount} 个页面</span>
            <span className="pv-meta-pill">研发评审中</span>
            <span>{viewerFile.subtitle}</span>
          </div>
        </div>
      </div>
      <div className="pv-topbar__right">
        <button type="button" className={`pv-chip${inspectMode ? ' is-active' : ''}`} onClick={toggleInspect}>
          <ToolOutlined /> 实时标注
        </button>
        <button type="button" disabled={!canComment} className={`pv-chip${commentMode ? ' is-active' : ''}`} onClick={toggleCommentMode}>
          <CommentOutlined /> 评论模式
        </button>
        <button type="button" className="pv-btn-secondary" onClick={() => message.info('导出标注（演示）')}>
          <ExportOutlined /> 导出标注
        </button>
        <Button type="primary" className="hd-btn-primary" disabled={!canManageShares} title={canManageShares ? '创建并管理当前原型的只读分享链接' : '仅文件编辑者可管理分享链接'} onClick={openShareManager}>
          <ShareAltOutlined /> 分享
        </Button>
      </div>
    </header>
  )

  const leftSidebar = (
    <div className="pv-left">
      <div className={`pv-project-switcher${projectSwitcherOpen ? ' is-open' : ''}`}>
        <div className="pv-project-switcher__label">当前项目</div>
        <button
          type="button"
          className="pv-project-switcher__trigger"
          aria-expanded={projectSwitcherOpen}
          onClick={() => setProjectSwitcherOpen((open) => !open)}
        >
          <span className="pv-project-switcher__main">
            <span className="pv-project-switcher__name">{project?.name ?? '加载项目中…'}</span>
            <span className="pv-project-switcher__meta">
              {projectTeam.name} · {currentTeamProject?.fileCount ?? 0} 个原型文件
            </span>
          </span>
          <span className="pv-project-switcher__arrow" aria-hidden="true">⌄</span>
        </button>
        <div className="pv-project-switcher__menu">
          {switchableProjects.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pv-project-switcher__option${item.id === project?.id ? ' is-active' : ''}`}
              onClick={() => {
                setProjectSwitcherOpen(false)
                if (item.id === project?.id) return
                void getFirstPreview(item.id)
                  .then((preview) => {
                    if (preview) navigate(`/files/${preview.fileId}/preview?page=${encodeURIComponent(preview.entryPageId)}`)
                    else message.warning('该项目暂无可预览的原型文件')
                  })
                  .catch(() => message.error('无法加载该项目的可预览原型'))
              }}
            >
              <span className="pv-project-switcher__option-title">{item.name}</span>
              <span className="pv-project-switcher__option-meta">
                {projectTeam.name} · {item.fileCount} 个原型文件
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pv-sidebar-group">
        <div className="pv-sidebar-label">原型内页面</div>
        <div className="pv-page-list">
          {viewerFile.pages.map((page) => {
            const isActive = page.id === activePage?.id
            const count = pageCommentCount(page.id)
            return (
              <button
                key={page.id}
                type="button"
                className={`pv-page-item${isActive ? ' is-active' : ''}`}
                onClick={() => switchPage(page.id)}
              >
                <div className="pv-page-name">{page.name}</div>
                <div className="pv-page-row-meta">
                  <span>{page.path}</span>
                  <span>{isActive ? '当前' : `评论 ${count}`}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pv-sidebar-group">
        <NavTree sections={['favorites']} />
      </div>

      <div className="pv-sidebar-group">
        <div className="pv-sidebar-label">本轮评审</div>
        <div className="pv-sidebar-note">
          <strong>本轮评审重点</strong>
          <p>
            确认首页首屏活动区、频道入口和推荐流的层级关系，同时校对按钮位置与标注规格。当前预览页：
            {activePage?.name ?? '—'}。
          </p>
        </div>
      </div>
    </div>
  )

  const rightSidebar = (
    <div className="pv-right">
      {inspectMode ? (
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

      <div className="pv-right-section">
        <div className="pv-sidebar-label">评论面板</div>
        <h3 className="pv-right-heading">评论记录 ({activeComments.length}){annotationsLoading ? ' · 加载中' : ''}</h3>
        <div className="pv-comment-list">
          {activeComments.length ? (
            activeComments.map((comment) => {
              const isActive = comment.markerId === activeMarker?.id
              return (
                <button
                  key={comment.id}
                  type="button"
                  className={`pv-comment-item${isActive ? ' is-active' : ''}`}
                  onClick={() => handleMarkerSelect(comment.markerId)}
                >
                  <div className="pv-comment-header">
                    <div className="pv-comment-avatar">{comment.avatar}</div>
                    <div>
                      <div className="pv-comment-author">{comment.author}</div>
                      <div className="pv-comment-time">
                        {comment.time} · {comment.anchor}
                      </div>
                    </div>
                  </div>
                  <div className="pv-comment-content">{comment.content}</div>
                  <div className="pv-comment-actions">
                    {comment.actions.map((action) => (
                      <span key={action} className="pv-comment-action">
                        {action}
                      </span>
                    ))}
                  </div>
                  {comment.replies?.length ? (
                    <div className="pv-reply-list">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="pv-reply-item">
                          <div className="pv-reply-header">
                            <span className="pv-reply-author">{reply.author}</span>
                          </div>
                          <div className="pv-reply-text">{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </button>
              )
            })
          ) : (
            <div className="pv-empty-panel">
              当前页面还没有标注评论。开启评论模式后，点击预览区即可新增并保存标注。
            </div>
          )}
        </div>

        <div className="pv-comment-composer">
          {newMarkerDraft ? (
            <div className="pv-draft-tip">
              <span>草稿位置 {Math.round(newMarkerDraft.leftPercent)}%, {Math.round(newMarkerDraft.topPercent)}%</span>
              <button type="button" onClick={() => setNewMarkerDraft(null)}>
                ✕
              </button>
            </div>
          ) : null}
          <TextArea
            placeholder={
              newMarkerDraft
                ? '输入对这个位置的评论...'
                : activeMarker
                  ? `回复标注 #${activeMarker.number}...`
                  : '先在评论模式下点击页面选择位置，或点击已有标注进行回复'
            }
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            autoSize={{ minRows: 4, maxRows: 6 }}
          />
          <Button type="primary" className="hd-btn-primary pv-composer-submit" loading={submittingComment} disabled={!canComment} onClick={() => void addComment()}>
            {newMarkerDraft ? '创建标注' : activeMarker ? '发送回复' : '发送评论'}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <ViewerShellLayout
      topbar={viewerTopbar}
      leftSidebar={leftSidebar}
      rightSidebar={rightSidebar}
      leftCollapsed={leftCollapsed}
      rightCollapsed={rightCollapsed}
    >
      <div className="pv-main">
        {viewerLoadError ? (
          <PageError title="原型预览加载失败" description={viewerLoadError} action={{ label: '重新加载', onClick: () => void loadViewer() }} />
        ) : viewerLoading ? (
          <PageLoading label="正在加载原型页面与访问权限" />
        ) : viewerFile.pages.length === 0 ? (
          <PageEmpty variant="files" title="这个原型没有可预览的页面" description="请检查 ZIP 原型的解析结果，或重新提交解析任务。" action={project ? { label: '返回项目', onClick: () => navigate(`/projects/${project.id}`) } : undefined} />
        ) : (
          <>
        <div className="pv-toolbar">
          <div className="pv-toolbar-main">
            <button
              type="button"
              className="pv-btn-secondary pv-panel-toggle"
              title={leftCollapsed ? '展开左侧栏' : '收起左侧栏'}
              onClick={() => setLeftCollapsed((v) => !v)}
            >
              <RightOutlined />
            </button>
            <div className="pv-toolbar-left">
              <div className="pv-zoom-control">
                <button type="button" className="pv-zoom-btn" onClick={zoomOut}>
                  <MinusOutlined />
                </button>
                <div className="pv-zoom-value">{zoomLevel}%</div>
                <button type="button" className="pv-zoom-btn" onClick={zoomIn}>
                  <PlusOutlined />
                </button>
              </div>
              <div className="pv-device-switch">
                {(
                  [
                    ['desktop', '桌面'],
                    ['tablet', '平板'],
                    ['mobile', '移动'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`pv-chip${deviceMode === mode ? ' is-active' : ''}`}
                    onClick={() => setDeviceMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="pv-toolbar-right">
            <span className="pv-chip">评论 {activeComments.length}</span>
            <span className="pv-chip">{modeLabel}</span>
            <button
              type="button"
              className="pv-btn-secondary pv-panel-toggle"
              title={rightCollapsed ? '展开右侧栏' : '收起右侧栏'}
              onClick={() => setRightCollapsed((v) => !v)}
            >
              <LeftOutlined />
            </button>
          </div>
        </div>

        <div className="pv-canvas-wrap">
          {inspectMode ? (
            <div className="pv-inspect-banner">
              <span>实时标注已开启</span>
              <span>|</span>
              <span>
                <kbd>Tab</kbd> 跳转元素 · <kbd>Esc</kbd> 退出
              </span>
            </div>
          ) : null}

          <div ref={frameShellRef} className={frameClassName} style={scaleStyle}>
            <div className="pv-frame-toolbar">
              <div className="pv-frame-dots">
                <span className="pv-frame-dot" />
                <span className="pv-frame-dot" />
                <span className="pv-frame-dot" />
              </div>
              <div className="pv-frame-url">{frameUrl}</div>
              <div className="pv-meta-pill">HTML Prototype</div>
            </div>

            <div className="pv-frame-body">
              {activePreviewUrl ? (
                <iframe
                  ref={iframeRef}
                  className="pv-live-frame"
                  src={activePreviewUrl}
                  title={activePage?.name ?? viewerFile.title}
                  sandbox="allow-same-origin allow-scripts"
                  onLoad={() => {
                    try {
                      const iframe = iframeRef.current
                      const doc = iframe?.contentDocument
                      if (doc && !doc.getElementById('__prototype-inspector')) {
                        const script = doc.createElement('script')
                        script.id = '__prototype-inspector'
                        script.src = '/prototype-assets/inspector.js?v=6'
                        // 脚本就绪后再同步模式，避免 postMessage 早于 inspector 初始化
                        script.onload = () => {
                          if (inspectMode) {
                            sendInspectorState(true)
                            sendViewerMode('inspect')
                          } else if (commentMode) {
                            sendViewerMode('comment')
                          } else {
                            sendViewerMode('normal')
                          }
                        }
                        doc.head.appendChild(script)
                      } else if (inspectMode) {
                        sendInspectorState(true)
                        sendViewerMode('inspect')
                      } else if (commentMode) {
                        sendViewerMode('comment')
                      } else {
                        sendViewerMode('normal')
                      }
                      // 兜底：无论 script onload 是否触发，延迟再同步一次
                      setTimeout(() => {
                        if (inspectMode) {
                          sendInspectorState(true)
                          sendViewerMode('inspect')
                        } else if (commentMode) {
                          sendViewerMode('comment')
                        } else {
                          sendViewerMode('normal')
                        }
                      }, 300)
                    } catch {
                      // ignore
                    }
                  }}
                />
              ) : (
                <div className="pv-empty-state">未找到可预览的 HTML 页面</div>
              )}

              <div
                className={`pv-overlay-layer${commentMode ? ' is-comment-mode' : ''}`}
                onPointerDown={handleCommentCanvasPointerDown}
              >
                {newMarkerDraft && commentMode ? (
                  <div
                    className="pv-marker-wrap"
                    style={{
                      top: `${newMarkerDraft.topPercent}%`,
                      left: `${newMarkerDraft.leftPercent}%`,
                      zIndex: 20,
                    }}
                  >
                    <div className="pv-comment-marker is-draft" title="草稿标注">
                      ?
                    </div>
                  </div>
                ) : null}

                {activeMarkers.map((marker) => {
                  const isActive = marker.id === activeMarker?.id
                  const position = getMarkerPosition(marker)
                  if (!position) return null
                  return (
                    <div
                      key={marker.id}
                      className="pv-marker-wrap"
                      style={{
                        top: `${position.top}%`,
                        left: `${position.left}%`,
                        zIndex: isActive ? 10 : 5,
                      }}
                    >
                      <button
                        type="button"
                        className={`pv-comment-marker${isActive ? ' is-active' : ''}${commentMode ? ' is-pulse' : ''}`}
                        title={`${marker.title} · 锚点 #${marker.number}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkerSelect(marker.id)
                        }}
                      >
                        {marker.number}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
      <Modal centered width={680} title="分享原型" open={shareOpen} onCancel={() => setShareOpen(false)} footer={<Button onClick={() => setShareOpen(false)}>关闭</Button>}>
        <p className="hd-share-modal__intro">分享对象登录并接受链接后，可获得该原型的只读预览权限；链接支持 1–30 天有效期。</p>
        <div className="hd-share-modal__create">
          <Select value={shareDays} onChange={setShareDays} options={[1, 3, 7, 14, 30].map((value) => ({ value, label: `${value} 天后过期` }))} />
          <Button type="primary" className="hd-btn-primary" loading={creatingShare} onClick={() => void createShare()}><ShareAltOutlined /> 创建并复制链接</Button>
        </div>
        <div className="hd-share-modal__list">
          {shareLoading ? <PageLoading label="正在加载分享记录" /> : null}
          {!shareLoading && shareLinks.length === 0 ? <PageEmpty title="还没有分享链接" description="创建链接后，可将该原型以只读权限分享给已登录用户。" /> : null}
          {!shareLoading && shareLinks.map((link) => <div key={link.id} className="hd-share-link-row">
            <div><strong>{link.status === 'active' ? '有效链接' : '已撤销链接'}</strong><span>到期：{new Date(link.expiresAt).toLocaleString('zh-CN', { hour12: false })} · 已接受 {link.acceptedCount} 次</span></div>
            {link.status === 'active' ? <Button danger size="small" loading={revokingShareId === link.id} onClick={() => void revokeShare(link.id)}>撤销</Button> : null}
          </div>)}
        </div>
      </Modal>
    </ViewerShellLayout>
  )
}
