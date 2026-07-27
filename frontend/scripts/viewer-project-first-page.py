from pathlib import Path

viewer_data_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\store\viewerMockData.ts")
viewer_page_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")

viewer_data = viewer_data_path.read_text(encoding="utf-8")
viewer_page = viewer_page_path.read_text(encoding="utf-8")

# Project -> first accessible prototype file. This is the frontend mock counterpart of
# the future API endpoint that returns a project’s first accessible prototype file.
mapping = """
/**
 * 当前 mock 中每个项目的首个可预览原型文件。
 * Viewer 的项目切换使用该映射，并通过首个 page id 打开文件的第一页。
 */
export const mockProjectFirstViewerFile: Record<string, string> = {
  'project-1': 'file-1',
  'project-2': 'file-2',
  'project-4': 'file-3',
}

"""

marker = "export const mockViewerFiles: Record<string, ViewerFileDetail> = {"
if "mockProjectFirstViewerFile" not in viewer_data:
    if marker not in viewer_data:
        raise SystemExit("viewer map insertion marker not found")
    viewer_data = viewer_data.replace(marker, mapping + marker, 1)
    viewer_data_path.write_text(viewer_data, encoding="utf-8")
    print("viewerMockData: project first-file map added")
else:
    print("viewerMockData: first-file map already exists")

old_import = """  mockViewerFiles,
  type ViewerMarker,
"""
new_import = """  mockViewerFiles,
  mockProjectFirstViewerFile,
  type ViewerMarker,
"""
if old_import not in viewer_page:
    raise SystemExit("viewer mock import anchor not found")
viewer_page = viewer_page.replace(old_import, new_import, 1)

old_router_import = "import { useNavigate, useParams } from 'react-router-dom'"
new_router_import = "import { useNavigate, useParams, useSearchParams } from 'react-router-dom'"
if old_router_import not in viewer_page:
    raise SystemExit("router import not found")
viewer_page = viewer_page.replace(old_router_import, new_router_import, 1)

old_params = """  const { message } = AntdApp.useApp()
  const { fileId = 'file-1' } = useParams()
"""
new_params = """  const { message } = AntdApp.useApp()
  const { fileId = 'file-1' } = useParams()
  const [searchParams] = useSearchParams()
"""
if old_params not in viewer_page:
    raise SystemExit("params block not found")
viewer_page = viewer_page.replace(old_params, new_params, 1)

# A `page` query parameter is an explicit navigation instruction from ProjectSwitcher.
# It wins over file's normal mock isCurrent default, so all project switches land at first page.
old_active_page = """  const activePage = useMemo(() => {
    const initialPageId =
      currentPageId ?? viewerFile.pages.find((page) => page.isCurrent)?.id ?? viewerFile.pages[0]?.id
    return viewerFile.pages.find((page) => page.id === initialPageId) ?? viewerFile.pages[0]
  }, [currentPageId, viewerFile.pages])
"""
new_active_page = """  const activePage = useMemo(() => {
    const requestedPageId = searchParams.get('page')
    const initialPageId =
      currentPageId ?? requestedPageId ?? viewerFile.pages.find((page) => page.isCurrent)?.id ?? viewerFile.pages[0]?.id
    return viewerFile.pages.find((page) => page.id === initialPageId) ?? viewerFile.pages[0]
  }, [currentPageId, searchParams, viewerFile.pages])
"""
if old_active_page not in viewer_page:
    raise SystemExit("active page selection block not found")
viewer_page = viewer_page.replace(old_active_page, new_active_page, 1)

old_option_click = """              onClick={() => {
                setProjectSwitcherOpen(false)
                if (item.id !== project.id) navigate(`/projects/${item.id}`)
              }}
"""
new_option_click = """              onClick={() => {
                setProjectSwitcherOpen(false)
                if (item.id === project.id) return

                const nextFileId = mockProjectFirstViewerFile[item.id]
                const firstPageId = nextFileId ? mockViewerFiles[nextFileId]?.pages[0]?.id : undefined
                if (!nextFileId || !firstPageId) {
                  message.warning('该项目暂未配置可预览的原型文件')
                  return
                }

                // 项目切换直接进入该项目首个原型文件的第一页。
                navigate(`/files/${nextFileId}/preview?page=${encodeURIComponent(firstPageId)}`)
              }}
"""
if old_option_click not in viewer_page:
    raise SystemExit("project switcher option click block not found")
viewer_page = viewer_page.replace(old_option_click, new_option_click, 1)

viewer_page_path.write_text(viewer_page, encoding="utf-8")
print("PrototypeViewerPage: project switch opens first viewer file / first page")
