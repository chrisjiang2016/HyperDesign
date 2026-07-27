from pathlib import Path

path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")
text = path.read_text(encoding="utf-8")

old_import = "import { mockProjectDetails, mockTeams, type ProjectDetailSummary } from '@/store/mockData'"
new_import = "import { mockProjectDetails, mockTeamProjects, mockTeams } from '@/store/mockData'"
if old_import not in text:
    raise SystemExit("mock data import not found")
text = text.replace(old_import, new_import, 1)

old_helper = """function getProjectFileCount(project: ProjectDetailSummary) {
  return project.folders.reduce((sum, folder) => sum + folder.files.length, 0) + project.rootFiles.length
}
"""
if old_helper not in text:
    raise SystemExit("detail file count helper not found")
text = text.replace(old_helper, "", 1)

old_projects = """  const switchableProjects = useMemo(
    () => Object.values(mockProjectDetails).filter((item) => item.teamId === project.teamId),
    [project.teamId],
  )
"""
new_projects = """  // 以当前用户所在团队为范围，直接展示该团队下的完整项目列表；
  // 不依赖项目详情 mock 是否存在，避免漏掉团队中的项目。
  const switchableProjects = useMemo(
    () => mockTeamProjects[project.teamId] ?? [],
    [project.teamId],
  )
  const currentTeamProject = useMemo(
    () => switchableProjects.find((item) => item.id === project.id),
    [project.id, switchableProjects],
  )
"""
if old_projects not in text:
    raise SystemExit("switchableProjects block not found")
text = text.replace(old_projects, new_projects, 1)

old_current_meta = """              {projectTeam.name} · {getProjectFileCount(project)} 个原型文件
"""
new_current_meta = """              {projectTeam.name} · {currentTeamProject?.fileCount ?? 0} 个原型文件
"""
if old_current_meta not in text:
    raise SystemExit("current project meta not found")
text = text.replace(old_current_meta, new_current_meta, 1)

old_option_meta = """                {projectTeam.name} · {getProjectFileCount(item)} 个原型文件
"""
new_option_meta = """                {projectTeam.name} · {item.fileCount} 个原型文件
"""
if old_option_meta not in text:
    raise SystemExit("option meta not found")
text = text.replace(old_option_meta, new_option_meta, 1)

path.write_text(text, encoding="utf-8")
print("Viewer ProjectSwitcher now uses mockTeamProjects[current team]")
