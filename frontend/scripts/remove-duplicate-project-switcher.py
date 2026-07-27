from pathlib import Path

page_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\ProjectDetailPage.tsx")
css_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\styles\shell.css")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# The project switcher is already available through the standard left NavTree.
# Remove the duplicate sidebarExtra card that was added above it.
page = page.replace(
    "import { mockProjectDetails, mockTeams, type ProjectDetailSummary, type PrototypeFileSummary } from '@/store/mockData'",
    "import { mockProjectDetails, mockTeams, type PrototypeFileSummary } from '@/store/mockData'",
    1,
)

helper = """function getProjectFileCount(project: ProjectDetailSummary) {
  return project.folders.reduce((sum, folder) => sum + folder.files.length, 0) + project.rootFiles.length
}

"""
if helper not in page:
    raise SystemExit("project file count helper not found")
page = page.replace(helper, "", 1)

page = page.replace("  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)\n", "", 1)

switchable = """  const switchableProjects = useMemo(
    () => Object.values(mockProjectDetails).filter((item) => item.teamId === project.teamId),
    [project.teamId],
  )

"""
if switchable not in page:
    raise SystemExit("switchable project block not found")
page = page.replace(switchable, "", 1)

start = page.find("      sidebarExtra={")
if start < 0:
    raise SystemExit("sidebarExtra not found")
end_marker = "      }\n    >\n      <div className=\"hd-page\">"
end = page.find(end_marker, start)
if end < 0:
    raise SystemExit("sidebarExtra end marker not found")
page = page[:start] + "    >\n      <div className=\"hd-page\">" + page[end + len(end_marker):]

page_path.write_text(page, encoding="utf-8")
print("ProjectDetailPage: duplicate sidebar project switcher removed")

css_start = css.find("/* ---------- Project switcher (mirrors prototype/project-detail.html) ---------- */")
if css_start >= 0:
    css_end = css.find(".hd-sidebar-group + .hd-sidebar-group", css_start)
    if css_end < 0:
        raise SystemExit("project switcher CSS end marker not found")
    css = css[:css_start] + css[css_end:]
    css_path.write_text(css, encoding="utf-8")
    print("shell.css: unused duplicate switcher styles removed")
else:
    print("shell.css: no switcher styles found")
