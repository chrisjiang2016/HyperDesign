from pathlib import Path

mock_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\store\mockData.ts")
viewer_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")

mock = mock_path.read_text(encoding="utf-8")
viewer = viewer_path.read_text(encoding="utf-8")

# Minimal read/write access model for the current authenticated user.
# It is intentionally data-only: the viewer does not add any permission UI.
permission_block = """
export type ProjectAccessLevel = 'view' | 'edit'

/**
 * 当前登录用户（Chris J）的项目级权限 mock。
 * 正式联调后由“当前用户项目权限”接口替换；未配置的项目视为无权限，不应出现在项目切换器中。
 */
export const mockCurrentUserProjectAccess: Record<string, ProjectAccessLevel> = {
  'project-1': 'edit',
  'project-2': 'view',
  'project-4': 'edit',
  'project-5': 'view',
  'project-7': 'edit',
}

"""

marker = "export const mockTeamMembers: Record<string, TeamMemberSummary[]> = {"
if "mockCurrentUserProjectAccess" not in mock:
    if marker not in mock:
        raise SystemExit("mock permission insertion marker not found")
    mock = mock.replace(marker, permission_block + marker, 1)
    mock_path.write_text(mock, encoding="utf-8")
    print("mockData: current-user project permission mapping added")
else:
    print("mockData: permission mapping already exists")

old_import = "import { mockProjectDetails, mockTeamProjects, mockTeams } from '@/store/mockData'"
new_import = "import { mockCurrentUserProjectAccess, mockProjectDetails, mockTeamProjects, mockTeams } from '@/store/mockData'"
if old_import not in viewer:
    raise SystemExit("viewer mock data import not found")
viewer = viewer.replace(old_import, new_import, 1)

old_projects = """  // 以当前用户所在团队为范围，直接展示该团队下的完整项目列表；
  // 不依赖项目详情 mock 是否存在，避免漏掉团队中的项目。
  const switchableProjects = useMemo(
    () => mockTeamProjects[project.teamId] ?? [],
    [project.teamId],
  )
"""
new_projects = """  // 项目切换器只展示：当前用户所在团队 + 当前用户有查看或编辑权限的项目。
  // 未在权限映射中出现的项目按无权限处理，不渲染到下拉列表。
  const switchableProjects = useMemo(
    () =>
      (mockTeamProjects[project.teamId] ?? []).filter(
        (item) => mockCurrentUserProjectAccess[item.id] === 'view' || mockCurrentUserProjectAccess[item.id] === 'edit',
      ),
    [project.teamId],
  )
"""
if old_projects not in viewer:
    raise SystemExit("viewer switchableProjects block not found")
viewer = viewer.replace(old_projects, new_projects, 1)

viewer_path.write_text(viewer, encoding="utf-8")
print("Viewer ProjectSwitcher: permission filter added")
