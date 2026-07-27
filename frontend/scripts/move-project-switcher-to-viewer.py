from pathlib import Path

page_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\PrototypeViewerPage.tsx")
css_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\styles\shell.css")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# Viewer needs only existing mock project/team records for the same project switcher data.
old_import = "import { mockProjectDetails } from '@/store/mockData'"
new_import = "import { mockProjectDetails, mockTeams, type ProjectDetailSummary } from '@/store/mockData'"
if old_import not in page:
    raise SystemExit("viewer mockData import not found")
page = page.replace(old_import, new_import, 1)

# Reuse the exact current-project metadata shown by the prototype: 团队 · N 个原型文件.
anchor = "const fmtPx = (n: number) => `${Math.round(n * 100) / 100}`\n"
helper = """const fmtPx = (n: number) => `${Math.round(n * 100) / 100}`

function getProjectFileCount(project: ProjectDetailSummary) {
  return project.folders.reduce((sum, folder) => sum + folder.files.length, 0) + project.rootFiles.length
}
"""
if anchor not in page:
    raise SystemExit("fmtPx anchor not found")
page = page.replace(anchor, helper, 1)

old_state = """  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [inspectedElement, setInspectedElement] = useState<InspectedElementSpec | null>(null)
"""
new_state = """  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)
  const [inspectedElement, setInspectedElement] = useState<InspectedElementSpec | null>(null)
"""
if old_state not in page:
    raise SystemExit("viewer state anchor not found")
page = page.replace(old_state, new_state, 1)

old_project_end = """  }, [viewerFile.id])

  const activePage = useMemo(() => {
"""
new_project_end = """  }, [viewerFile.id])
  const projectTeam = useMemo(
    () => mockTeams.find((item) => item.id === project.teamId) ?? mockTeams[0],
    [project.teamId],
  )
  const switchableProjects = useMemo(
    () => Object.values(mockProjectDetails).filter((item) => item.teamId === project.teamId),
    [project.teamId],
  )

  const activePage = useMemo(() => {
"""
if old_project_end not in page:
    raise SystemExit("viewer project end anchor not found")
page = page.replace(old_project_end, new_project_end, 1)

old_workbench = """      <div className="pv-sidebar-group">
        <NavTree sections={['workbench']} />
      </div>

      <div className="pv-sidebar-group">
"""
new_switcher = """      <div className={`pv-project-switcher${projectSwitcherOpen ? ' is-open' : ''}`}>
        <div className="pv-project-switcher__label">当前项目</div>
        <button
          type="button"
          className="pv-project-switcher__trigger"
          aria-expanded={projectSwitcherOpen}
          onClick={() => setProjectSwitcherOpen((open) => !open)}
        >
          <span className="pv-project-switcher__main">
            <span className="pv-project-switcher__name">{project.name}</span>
            <span className="pv-project-switcher__meta">
              {projectTeam.name} · {getProjectFileCount(project)} 个原型文件
            </span>
          </span>
          <span className="pv-project-switcher__arrow" aria-hidden="true">⌄</span>
        </button>
        <div className="pv-project-switcher__menu">
          {switchableProjects.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pv-project-switcher__option${item.id === project.id ? ' is-active' : ''}`}
              onClick={() => {
                setProjectSwitcherOpen(false)
                if (item.id !== project.id) navigate(`/projects/${item.id}`)
              }}
            >
              <span className="pv-project-switcher__option-title">{item.name}</span>
              <span className="pv-project-switcher__option-meta">
                {projectTeam.name} · {getProjectFileCount(item)} 个原型文件
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pv-sidebar-group">
"""
if old_workbench not in page:
    raise SystemExit("viewer workbench block not found")
page = page.replace(old_workbench, new_switcher, 1)
page_path.write_text(page, encoding="utf-8")
print("PrototypeViewerPage: project switcher added and workbench NavTree removed")

css_block = r'''
/* ---------- Viewer project switcher (replaces Viewer workbench / my teams tree) ---------- */
.pv-project-switcher {
  padding: 18px 16px 0;
}

.pv-project-switcher__label {
  padding: 0 10px;
  margin-bottom: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pv-project-switcher__trigger {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-surface);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition: var(--transition-fast);
}

.pv-project-switcher__trigger:hover {
  border-color: #d0d5dd;
  background: var(--bg-muted);
}

.pv-project-switcher__main {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pv-project-switcher__name,
.pv-project-switcher__option-title {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv-project-switcher__name {
  margin-bottom: 3px;
}

.pv-project-switcher__meta,
.pv-project-switcher__option-meta {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.4;
}

.pv-project-switcher__arrow {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1;
  transition: transform var(--transition-fast);
}

.pv-project-switcher.is-open .pv-project-switcher__arrow {
  transform: rotate(180deg);
}

.pv-project-switcher__menu {
  display: none;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.pv-project-switcher.is-open .pv-project-switcher__menu {
  display: block;
}

.pv-project-switcher__option {
  width: 100%;
  padding: 12px;
  border: none;
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  text-align: left;
  transition: var(--transition-fast);
}

.pv-project-switcher__option + .pv-project-switcher__option {
  border-top: 1px solid var(--border-soft);
}

.pv-project-switcher__option:hover {
  background: var(--bg-muted);
}

.pv-project-switcher__option.is-active {
  background: var(--brand-soft);
}

.pv-project-switcher__option-title {
  display: block;
  margin-bottom: 4px;
}

.pv-project-switcher__option-meta {
  display: block;
}
'''

if ".pv-project-switcher" not in css:
    marker = "/* ---------- Viewer shell ---------- */"
    if marker not in css:
        raise SystemExit("viewer CSS marker not found")
    css = css.replace(marker, css_block + "\n" + marker, 1)
    css_path.write_text(css, encoding="utf-8")
    print("shell.css: viewer project switcher styles added")
else:
    print("shell.css: viewer project switcher styles already exist")
