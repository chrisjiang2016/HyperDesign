import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { CaretDownOutlined, FolderOutlined, HomeOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { getFirstPreview } from '@/api/workspace'
import { useWorkspaceStore } from '@/store/workspaceStore'

export type NavTreeSection = 'workbench' | 'favorites'

interface NavTreeProps {
  /** 控制渲染哪些区块，默认全部 */
  sections?: NavTreeSection[]
}

export function NavTree({ sections = ['workbench', 'favorites'] }: NavTreeProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const collapsedGroups = useWorkspaceStore((state) => state.collapsedGroups)
  const toggleGroup = useWorkspaceStore((state) => state.toggleGroup)
  const navTeams = useWorkspaceStore((state) => state.navTeams)
  const fetchNavTeams = useWorkspaceStore((state) => state.fetchNavTeams)

  useEffect(() => {
    void fetchNavTeams()
  }, [fetchNavTeams])

  const showWorkbench = sections.includes('workbench')
  const showFavorites = sections.includes('favorites')

  const isGroupCollapsed = (groupId: string, defaultCollapsed = false) => {
    if (groupId in collapsedGroups) return collapsedGroups[groupId]
    return defaultCollapsed
  }
  const firstProject = useMemo(() => navTeams.flatMap((team) => team.projects.map((project) => ({ ...project, teamId: team.id }))).at(0), [navTeams])
  const firstTeam = navTeams[0]
  const openFirstPreview = () => {
    if (!firstProject) { message.info('暂无可预览的项目'); return }
    void getFirstPreview(firstProject.id).then((preview) => {
      if (!preview) { message.info('该项目暂无可预览的原型'); return }
      navigate(`/files/${preview.fileId}/preview?page=${encodeURIComponent(preview.entryPageId)}`)
    }).catch(() => message.error('无法加载最近原型'))
  }

  // 当前路由是否落在该团队内（团队页本身，或其下任一项目页）
  const isInTeam = (teamId: string, projectIds: string[]) =>
    location.pathname === `/teams/${teamId}` || projectIds.some((id) => location.pathname === `/projects/${id}`)

  const myTeamsCollapsed = isGroupCollapsed('my-teams')
  const favoritesCollapsed = isGroupCollapsed('favorites')

  return (
    <div className="hd-nav-tree">
      {showWorkbench ? (
        <div className="hd-sidebar-group">
          <div className="hd-sidebar-label">工作台</div>
          <ul className="hd-nav-list">
            <li className={`hd-nav-group${myTeamsCollapsed ? ' is-collapsed' : ''}`}>
              <div className="hd-nav-parent-row">
                <button
                  type="button"
                  className="hd-nav-caret-btn"
                  onClick={() => toggleGroup('my-teams')}
                  aria-expanded={!myTeamsCollapsed}
                  aria-label={myTeamsCollapsed ? '展开我的团队' : '折叠我的团队'}
                  title={myTeamsCollapsed ? '展开' : '折叠'}
                >
                  <CaretDownOutlined className="hd-nav-caret" aria-hidden="true" />
                </button>
                <button type="button" className="hd-nav-parent hd-nav-parent--nested" onClick={() => toggleGroup('my-teams')}>
                  <TeamOutlined className="hd-nav-icon" aria-hidden="true" />
                  <span className="hd-nav-label">我的团队</span>
                  <span className="hd-nav-meta">{navTeams.length}</span>
                </button>
              </div>

              <div className={`hd-nav-children-wrap${myTeamsCollapsed ? ' is-collapsed' : ''}`}>
                <ul className="hd-nav-children">
                  {navTeams.map((team, index) => {
                    const projects = team.projects
                    const teamGroupId = `team-${team.id}`
                    const teamActive = location.pathname === `/teams/${team.id}`
                    // 命中当前路由时默认展开，便于定位；用户手动折叠过则以用户操作为准
                    const defaultCollapsed = isInTeam(team.id, projects.map((project) => project.id)) ? false : index > 0
                    const collapsed = isGroupCollapsed(teamGroupId, defaultCollapsed)

                    return (
                      <li key={team.id} className={`hd-nav-group${collapsed ? ' is-collapsed' : ''}`}>
                        <div className="hd-nav-parent-row">
                          <button
                            type="button"
                            className="hd-nav-caret-btn"
                            onClick={() => toggleGroup(teamGroupId, defaultCollapsed)}
                            aria-expanded={!collapsed}
                            aria-label={`${collapsed ? '展开' : '折叠'}${team.name}`}
                            title={collapsed ? '展开' : '折叠'}
                          >
                            <CaretDownOutlined className="hd-nav-caret" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="hd-nav-parent hd-nav-parent--nested"
                            onClick={() => navigate(`/teams/${team.id}`)}
                          >
                            <span className="hd-team-color" style={{ background: team.color }} />
                            <span className="hd-nav-label">{team.name}</span>
                            <span className="hd-nav-meta">{team.projectCount}</span>
                          </button>
                          <Link
                            to={`/teams/${team.id}`}
                            className={`hd-nav-team-link${teamActive ? ' is-active' : ''}`}
                            title="打开团队"
                          >
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>

                        <div className={`hd-nav-children-wrap${collapsed ? ' is-collapsed' : ''}`}>
                          <ul className="hd-nav-children">
                            {projects.length > 0 ? (
                              projects.map((project) => {
                                const active = location.pathname === `/projects/${project.id}`
                                return (
                                  <li key={project.id}>
                                    <Link
                                      to={`/projects/${project.id}`}
                                      className={`hd-nav-child${active ? ' is-active' : ''}`}
                                    >
                                      <FolderOutlined className="hd-nav-icon" aria-hidden="true" />
                                      <span className="hd-nav-label">{project.name}</span>
                                    </Link>
                                  </li>
                                )
                              })
                            ) : (
                              <li>
                                <Link to={`/teams/${team.id}`} className="hd-nav-child">
                                  <FolderOutlined className="hd-nav-icon" aria-hidden="true" />
                                  <span className="hd-nav-label">项目列表</span>
                                </Link>
                              </li>
                            )}
                          </ul>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </li>
          </ul>
        </div>
      ) : null}

      {showFavorites ? (
        <div className="hd-sidebar-group">
          <div className="hd-sidebar-label">常用</div>
          <ul className="hd-nav-list">
            <li className={`hd-nav-group${favoritesCollapsed ? ' is-collapsed' : ''}`}>
              <div className="hd-nav-parent-row">
                <button
                  type="button"
                  className="hd-nav-caret-btn"
                  onClick={() => toggleGroup('favorites')}
                  aria-expanded={!favoritesCollapsed}
                  aria-label={favoritesCollapsed ? '展开收藏与最近' : '折叠收藏与最近'}
                  title={favoritesCollapsed ? '展开' : '折叠'}
                >
                  <CaretDownOutlined className="hd-nav-caret" aria-hidden="true" />
                </button>
                <button type="button" className="hd-nav-parent hd-nav-parent--nested" onClick={() => toggleGroup('favorites')}>
                  <span className="hd-nav-icon hd-nav-icon--star" aria-hidden="true">★</span>
                  <span className="hd-nav-label">收藏与最近</span>
                </button>
              </div>
              <div className={`hd-nav-children-wrap${favoritesCollapsed ? ' is-collapsed' : ''}`}>
                <ul className="hd-nav-children">
                  {firstProject ? <li>
                    <Link to={`/projects/${firstProject.id}`} className={`hd-nav-child${location.pathname === `/projects/${firstProject.id}` ? ' is-active' : ''}`}>
                      <FolderOutlined className="hd-nav-icon" aria-hidden="true" />
                      <span className="hd-nav-label">最近项目</span>
                    </Link>
                  </li> : null}
                  {firstProject ? <li>
                    <button type="button" className={`hd-nav-child${location.pathname.startsWith('/files/') ? ' is-active' : ''}`} onClick={openFirstPreview}>
                      <FolderOutlined className="hd-nav-icon" aria-hidden="true" />
                      <span className="hd-nav-label">首页原型</span>
                    </button>
                  </li> : null}
                  {firstTeam ? <li>
                    <Link to={`/teams/${firstTeam.id}`} className="hd-nav-child">
                      <UserOutlined className="hd-nav-icon" aria-hidden="true" />
                      <span className="hd-nav-label">团队成员</span>
                    </Link>
                  </li> : null}
                  <li>
                    <Link to="/" className={`hd-nav-child${location.pathname === '/' ? ' is-active' : ''}`}>
                      <HomeOutlined className="hd-nav-icon" aria-hidden="true" />
                      <span className="hd-nav-label">返回工作台</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
