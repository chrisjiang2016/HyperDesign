import { Button, Form, Input, Modal } from 'antd'
import { PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShellLayout } from '@/layouts/AppLayouts'
import { RightPanel } from '@/components/workspace/RightPanel'
import { PageEmpty, PageError, PageLoading } from '@/components/common/pagestates'
import { createTeam, getWorkspace, type WorkspaceData } from '@/api/workspace'
import { useWorkspaceStore } from '@/store/workspaceStore'

interface CreateTeamValues {
  name: string
  description?: string
}

export function TeamsPage() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchNavTeams = useWorkspaceStore((state) => state.fetchNavTeams)
  const [form] = Form.useForm<CreateTeamValues>()

  const loadWorkspace = async () => {
    setLoading(true)
    setError(null)
    try {
      setWorkspace(await getWorkspace())
    } catch {
      setWorkspace(null)
      setError('工作台数据加载失败，请确认后端服务已启动后重试。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
  }, [])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await createTeam(values)
      await Promise.all([loadWorkspace(), fetchNavTeams()])
      setOpen(false)
      form.resetFields()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShellLayout
      breadcrumb={
        <>
          <span>工作台</span>
          <span>/</span>
          <span className="is-current">我的团队</span>
        </>
      }
      searchPlaceholder="搜索团队、项目、原型文件"
      rightbar={<RightPanel activities={workspace?.activities ?? []} />}
    >
      <div className="hd-page">
        <div className="hd-workspace-meta">
          <span>
            当前空间：<strong>{workspace?.teams[0]?.name ?? '我的团队'}</strong>
          </span>
          <span>数据来源：HyperDesign API</span>
        </div>

        <section className="hd-hero-panel">
          <h1>统一管理团队原型、评审进度与协作动态</h1>
          <p>
            在同一套工作台里完成团队管理、项目推进、原型评审和研发交接。当前首页聚焦最近活跃团队与关键协作动态，减少无关装饰，让信息更直接。
          </p>
          <div className="hd-hero-actions">
            <Button type="primary" className="hd-btn-primary" onClick={() => setOpen(true)}>
              <PlusOutlined /> 创建团队
            </Button>
            <Button className="hd-btn-secondary" onClick={() => navigate('/files/file-1/preview')}>
              <PlayCircleOutlined /> 查看核心演示页
            </Button>
          </div>
        </section>

        {error ? <PageError title="工作台加载失败" description={error} action={{ label: '重新加载', onClick: () => void loadWorkspace() }} /> : null}

        {!error ? <div className="hd-summary-grid">
          {(workspace?.summary ?? []).map((card) => (
            <div key={card.id} className="hd-summary-card">
              <div className="hd-summary-label">{card.label}</div>
              <div className="hd-summary-value">{card.value}</div>
              <div className="hd-summary-meta">
                {card.tone === 'success' || card.tone === 'warning' ? (
                  <span className={`hd-status-pill is-${card.tone}`}>{card.metaPrimary}</span>
                ) : (
                  <span>{card.metaPrimary}</span>
                )}
                {card.metaSecondary ? <span>{card.metaSecondary}</span> : null}
              </div>
            </div>
          ))}
        </div> : null}

        {!error ? <section className="hd-section-panel">
          <div className="hd-page-toolbar">
            <div>
              <h2>我的团队</h2>
              <p>优先展示最近活跃团队，便于快速进入后续项目与原型查看流程。</p>
            </div>
            <Button type="primary" className="hd-btn-primary" onClick={() => setOpen(true)}>
              <PlusOutlined /> 创建团队
            </Button>
          </div>

          {loading ? <PageLoading label="正在加载团队数据" /> : null}
          {!loading && !error ? <div className="hd-team-grid">
            {(workspace?.teams ?? []).map((team) => (
              <button
                key={team.id}
                type="button"
                className="hd-team-card"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <span className={`hd-team-role${team.roleLabel === '管理员' ? ' is-admin' : ''}`}>
                  {team.roleLabel}
                </span>
                <h3>{team.name}</h3>
                <p>{team.description}</p>
                <div className="hd-team-stat-row">
                  <span>{team.memberCount} 成员</span>
                  <span>{team.projectCount} 项目</span>
                  <span>{team.extraStat}</span>
                </div>
              </button>
            ))}
          </div> : null}
          {!loading && !error && workspace?.teams.length === 0 ? <PageEmpty variant="files" title="还没有团队" description="创建第一个团队后，即可开始管理项目、原型文件和协作评审。" action={{ label: '创建团队', onClick: () => setOpen(true) }} /> : null}
        </section> : null}
      </div>

      <Modal
        centered
        title="创建团队"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ className: 'hd-btn-primary', loading: submitting }}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="团队名称" name="name" rules={[{ required: true, message: '请输入团队名称' }]}>
            <Input placeholder="请输入团队名称" />
          </Form.Item>
          <Form.Item label="团队描述" name="description">
            <Input.TextArea rows={4} placeholder="请输入团队描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </AppShellLayout>
  )
}
