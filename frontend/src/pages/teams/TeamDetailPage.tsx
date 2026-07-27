import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, Modal, message } from 'antd'
import { PlusOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { createProject, getTeamDetail, type TeamDetail } from '@/api/workspace'
import { AppShellLayout } from '@/layouts/AppLayouts'
import { RightPanel } from '@/components/workspace/RightPanel'
import { PageEmpty, PageError, PageLoading } from '@/components/common/pagestates'
import { useWorkspaceStore } from '@/store/workspaceStore'

type ContentTab = 'projects' | 'members'
type NewProjectValues = { name: string; description?: string }

const teamActivities = [
  { id: 'team-api', title: '团队协作已接入真实数据', summary: '项目、成员与文件统计均由 HyperDesign API 返回。' },
]

export function TeamDetailPage() {
  const navigate = useNavigate()
  const { teamId = '' } = useParams()
  const [keyword, setKeyword] = useState('')
  const [tab, setTab] = useState<ContentTab>('projects')
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectOpen, setProjectOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<NewProjectValues>()
  const fetchNavTeams = useWorkspaceStore((state) => state.fetchNavTeams)

  const loadTeam = async () => {
    setLoading(true)
    setError(null)
    try {
      setTeam(await getTeamDetail(teamId))
    } catch {
      setError('团队不存在，或你没有访问权限。')
      setTeam(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teamId) void loadTeam()
  }, [teamId])

  const filteredProjects = useMemo(
    () => team?.projects.filter((item) => item.name.includes(keyword) || item.description.includes(keyword)) ?? [],
    [team, keyword],
  )
  const filteredMembers = useMemo(
    () => team?.members.filter((item) => item.name.includes(keyword) || item.email.includes(keyword)) ?? [],
    [team, keyword],
  )

  const handleCreateProject = async () => {
    if (!team) return
    const values = await form.validateFields()
    setCreating(true)
    try {
      const project = await createProject(team.id, values)
      await Promise.all([loadTeam(), fetchNavTeams()])
      setProjectOpen(false)
      form.resetFields()
      message.success('项目已创建')
      navigate(`/projects/${project.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppShellLayout
      breadcrumb={<><span>我的团队</span><span>/</span><span className="is-current">{team?.name ?? '团队详情'}</span></>}
      searchPlaceholder="搜索项目、成员、原型文件"
      rightbar={<RightPanel title="最近活动" activities={teamActivities} />}
    >
      <div className="hd-page">
        {error ? <PageError title="团队详情加载失败" description={error} action={{ label: '重新加载', onClick: () => void loadTeam() }} /> : null}
        {loading ? <PageLoading label="正在加载团队数据" /> : null}
        {team ? <>
          <section className="hd-hero-panel">
            <div className="hd-team-title">{team.name}</div>
            <div className="hd-team-desc">{team.description}</div>
            <div className="hd-team-meta-row">
              <span className="hd-meta-pill">{team.roleLabel}</span>
              <span className="hd-meta-pill">{team.canUpload ? '可上传原型' : '仅查看原型'}</span>
              <span className="hd-status-pill is-success">{team.projectCount} 个项目</span>
            </div>
            <div className="hd-hero-actions">
              <Button type="primary" className="hd-btn-primary" disabled={team.roleLabel !== '管理员'} onClick={() => setProjectOpen(true)}><PlusOutlined /> 新建项目</Button>
              <Button className="hd-btn-secondary" disabled title="成员邀请将在协作权限完善后开放"><UserAddOutlined /> 邀请成员</Button>
            </div>
          </section>

          <div className="hd-summary-grid">
            <div className="hd-summary-card"><div className="hd-summary-label">团队成员</div><div className="hd-summary-value">{team.memberCount}</div><div className="hd-summary-meta"><span>管理员 {team.adminCount} 人</span></div></div>
            <div className="hd-summary-card"><div className="hd-summary-label">团队项目</div><div className="hd-summary-value">{team.projectCount}</div><div className="hd-summary-meta"><span>按项目权限过滤展示</span></div></div>
            <div className="hd-summary-card"><div className="hd-summary-label">原型文件</div><div className="hd-summary-value">{team.fileCountEstimate}</div><div className="hd-summary-meta"><span>项目内 ZIP 原型</span></div></div>
            <div className="hd-summary-card"><div className="hd-summary-label">待处理反馈</div><div className="hd-summary-value">{team.pendingFeedbackCount}</div><div className="hd-summary-meta"><span>评论模块将在下一 Sprint 接入</span></div></div>
          </div>

          <section className="hd-section-panel">
            <div className="hd-page-toolbar hd-page-toolbar--team">
              <div><h2>团队内容</h2><p>按项目与成员两个视图管理团队协作内容。</p></div>
              <div className="hd-toolbar-actions">
                <div className="hd-segment-tabs">
                  <button type="button" className={`hd-segment-btn${tab === 'projects' ? ' is-active' : ''}`} onClick={() => setTab('projects')}>项目</button>
                  <button type="button" className={`hd-segment-btn${tab === 'members' ? ' is-active' : ''}`} onClick={() => setTab('members')}>成员</button>
                </div>
                <label className="hd-search-box"><SearchOutlined aria-hidden="true" /><Input variant="borderless" placeholder="搜索项目或成员" value={keyword} onChange={(e) => setKeyword(e.target.value)} allowClear /></label>
              </div>
            </div>
            {tab === 'projects' ? <div className="hd-project-grid">
              {filteredProjects.map((project) => <button key={project.id} type="button" className="hd-project-card" onClick={() => navigate(`/projects/${project.id}`)}><h3>{project.name}</h3><p>{project.description}</p><div className="hd-project-meta"><span>{project.fileCount} 个文件</span><span>{project.updatedAt}</span></div></button>)}
              {filteredProjects.length === 0 ? <PageEmpty variant="files" title="没有可访问的项目" description={keyword ? '请调整搜索关键词后重试。' : '创建项目后，即可上传原型文件并邀请团队成员协作。'} action={!keyword && team.roleLabel === '管理员' ? { label: '新建项目', onClick: () => setProjectOpen(true) } : undefined} /> : null}
            </div> : <div className="hd-member-list">
              {filteredMembers.map((member) => <div key={member.id} className="hd-member-row"><div className="hd-member-main"><div className="hd-member-avatar">{member.initials}</div><div><div className="hd-member-name">{member.name}</div><div className="hd-member-email">{member.email}</div></div></div><div className="hd-member-actions"><span className={`hd-team-role${member.role === '管理员' ? ' is-admin' : ''}`}>{member.role}</span><span className="hd-meta-pill">{member.canUpload ? '可上传' : '不可上传'}</span></div></div>)}
              {filteredMembers.length === 0 ? <PageEmpty title="没有匹配的成员" description={keyword ? '请调整搜索关键词后重试。' : '成员邀请能力将在协作权限模块完善后开放。'} /> : null}
            </div>}
          </section>
        </> : null}
      </div>
      <Modal centered title="新建项目" open={projectOpen} onCancel={() => setProjectOpen(false)} onOk={handleCreateProject} okText="创建" cancelText="取消" okButtonProps={{ className: 'hd-btn-primary', loading: creating }}>
        <Form form={form} layout="vertical" requiredMark={false}><Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}><Input placeholder="例如：会员中心改版" /></Form.Item><Form.Item label="项目描述" name="description"><Input.TextArea rows={3} placeholder="可选，简述协作目标" /></Form.Item></Form>
      </Modal>
    </AppShellLayout>
  )
}
