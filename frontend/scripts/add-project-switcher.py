from pathlib import Path

page_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\pages\projects\ProjectDetailPage.tsx")
css_path = Path(r"C:\Users\Chris J\.openclaw\workspace-fullstack-dev\HTML prototype\frontend\src\styles\shell.css")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# Keep source data scope to projects with actual detail data: switching never falls back to a wrong project.
old_import = "import { mockProjectDetails, mockTeams, type PrototypeFileSummary } from '@/store/mockData'"
new_import = "import { mockProjectDetails, mockTeams, type ProjectDetailSummary, type PrototypeFileSummary } from '@/store/mockData'"
if old_import not in page:
    raise SystemExit("mockData import not found")
page = page.replace(old_import, new_import, 1)

# Add reusable metadata function: same info hierarchy as prototype's '团队 · N 个原型文件'.
anchor = """function buildAssets(projectId: string): AssetItem[] {
"""
helper = """function getProjectFileCount(project: ProjectDetailSummary) {
  return project.folders.reduce((sum, folder) => sum + folder.files.length, 0) + project.rootFiles.length
}

"""
if helper not in page:
    if anchor not in page:
        raise SystemExit("buildAssets anchor not found")
    page = page.replace(anchor, helper + anchor, 1)

# State exactly only for prototype dropdown behavior.
old_state = """  const [filter, setFilter] = useState<AssetFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [form] = Form.useForm<UploadFormValues>()
"""
new_state = """  const [filter, setFilter] = useState<AssetFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)
  const [form] = Form.useForm<UploadFormValues>()
"""
if old_state not in page:
    raise SystemExit("state block not found")
page = page.replace(old_state, new_state, 1)

# Derive available switch targets from existing project details of current team, with no invented projects.
old_team_block = """  const team = useMemo(
    () => mockTeams.find((item) => item.id === project.teamId) ?? mockTeams[0],
    [project.teamId],
  )

  const assets = useMemo(() => buildAssets(project.id), [project.id])
"""
new_team_block = """  const team = useMemo(
    () => mockTeams.find((item) => item.id === project.teamId) ?? mockTeams[0],
    [project.teamId],
  )
  const switchableProjects = useMemo(
    () => Object.values(mockProjectDetails).filter((item) => item.teamId === project.teamId),
    [project.teamId],
  )

  const assets = useMemo(() => buildAssets(project.id), [project.id])
"""
if old_team_block not in page:
    raise SystemExit("team block not found")
page = page.replace(old_team_block, new_team_block, 1)

# Place project switcher via already-existing AppShell sidebarExtra slot. No modifications to generic global nav.
old_layout = """      searchPlaceholder="搜索项目或文件"
      rightbar={<RightPanel title="项目动态" activities={projectActivities} />}
    >
"""
new_layout = """      searchPlaceholder="搜索项目或文件"
      rightbar={<RightPanel title="项目动态" activities={projectActivities} />}
      sidebarExtra={
        <div className={`hd-project-switcher${projectSwitcherOpen ? ' is-open' : ''}`}>
          <div className="hd-project-switcher__label">当前项目</div>
          <button
            type="button"
            className="hd-project-switcher__trigger"
            aria-expanded={projectSwitcherOpen}
            onClick={() => setProjectSwitcherOpen((open) => !open)}
          >
            <span className="hd-project-switcher__main">
              <span className="hd-project-switcher__name">{project.name}</span>
              <span className="hd-project-switcher__meta">
                {team.name} · {getProjectFileCount(project)} 个原型文件
              </span>
            </span>
            <span className="hd-project-switcher__arrow" aria-hidden="true">⌄</span>
          </button>
          <div className="hd-project-switcher__menu">
            {switchableProjects.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`hd-project-switcher__option${item.id === project.id ? ' is-active' : ''}`}
                onClick={() => {
                  setProjectSwitcherOpen(false)
                  if (item.id !== project.id) navigate(`/projects/${item.id}`)
                }}
              >
                <span className="hd-project-switcher__option-title">{item.name}</span>
                <span className="hd-project-switcher__option-meta">
                  {team.name} · {getProjectFileCount(item)} 个原型文件
                </span>
              </button>
            ))}
          </div>
        </div>
      }
    >
"""
if old_layout not in page:
    raise SystemExit("AppShell layout props anchor not found")
page = page.replace(old_layout, new_layout, 1)
page_path.write_text(page, encoding="utf-8")
print("ProjectDetailPage updated")

css_block = r'''
/* ---------- Project switcher (mirrors prototype/project-detail.html) ---------- */
.hd-project-switcher {
  margin-bottom: 22px;
}

.hd-project-switcher__label {
  padding: 0 10px;
  margin-bottom: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hd-project-switcher__trigger {
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

.hd-project-switcher__trigger:hover {
  border-color: #d0d5dd;
  background: var(--bg-muted);
}

.hd-project-switcher__main {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.hd-project-switcher__name,
.hd-project-switcher__option-title {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hd-project-switcher__name {
  margin-bottom: 3px;
}

.hd-project-switcher__meta,
.hd-project-switcher__option-meta {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.4;
}

.hd-project-switcher__arrow {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1;
  transition: transform var(--transition-fast);
}

.hd-project-switcher.is-open .hd-project-switcher__arrow {
  transform: rotate(180deg);
}

.hd-project-switcher__menu {
  display: none;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.hd-project-switcher.is-open .hd-project-switcher__menu {
  display: block;
}

.hd-project-switcher__option {
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

.hd-project-switcher__option + .hd-project-switcher__option {
  border-top: 1px solid var(--border-soft);
}

.hd-project-switcher__option:hover {
  background: var(--bg-muted);
}

.hd-project-switcher__option.is-active {
  background: var(--brand-soft);
}

.hd-project-switcher__option-title {
  display: block;
  margin-bottom: 4px;
}

.hd-project-switcher__option-meta {
  display: block;
}
'''

if ".hd-project-switcher" not in css:
    # Sidebar styles are the corresponding design-system section.
    marker = ".hd-sidebar-group + .hd-sidebar-group {\n  margin-top: 24px;\n}\n"
    if marker not in css:
        raise SystemExit("css sidebar marker not found")
    css = css.replace(marker, css_block + "\n" + marker, 1)
    css_path.write_text(css, encoding="utf-8")
    print("shell.css updated")
else:
    print("switcher CSS already exists")
