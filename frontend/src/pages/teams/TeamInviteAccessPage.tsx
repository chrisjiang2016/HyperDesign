import { Button } from 'antd'
import { LoginOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AppLayouts'
import { PageError, PageLoading } from '@/components/common/pagestates'
import { acceptTeamInvite, inspectTeamInvite } from '@/api/workspace'
import { getCurrentUser } from '@/api/auth'

type TeamInviteInfo = { team: { id: string; name: string; description: string }; expiresAt: string }

export function TeamInviteAccessPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [invite, setInvite] = useState<TeamInviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInvite = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!token) throw new Error('missing token')
      setInvite(await inspectTeamInvite(token))
    } catch {
      setInvite(null)
      setError('这个团队邀请链接无效、已过期或已被撤销。')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void loadInvite() }, [loadInvite])

  const accept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      await getCurrentUser()
    } catch {
      navigate('/login', { replace: true, state: { from: location.pathname } })
      return
    }

    try {
      const result = await acceptTeamInvite(token)
      navigate(`/teams/${result.teamId}`, { replace: true })
    } catch {
      setError('加入团队失败，邀请链接可能已失效。请重新打开链接后重试。')
    } finally {
      setAccepting(false)
    }
  }

  return <AuthLayout>
    {loading ? <PageLoading label="正在验证团队邀请" /> : null}
    {error ? <PageError title="无法加入团队" description={error} action={{ label: '重新验证', onClick: () => void loadInvite() }} /> : null}
    {invite && !error ? <section className="hd-share-access-card">
      <div className="hd-share-access-card__icon"><TeamOutlined /></div>
      <span className="hd-share-access-card__eyebrow">HyperDesign 团队邀请</span>
      <h1>{invite.team.name}</h1>
      <p>{invite.team.description}</p>
      <div className="hd-share-access-card__notice"><UserAddOutlined /> 接受邀请后，你将加入该团队成为普通成员，并可进入其协作空间。</div>
      <p className="hd-share-access-card__expiry">链接有效至：{new Date(invite.expiresAt).toLocaleString('zh-CN', { hour12: false })}</p>
      <Button type="primary" className="hd-btn-primary" block loading={accepting} onClick={() => void accept()}><LoginOutlined /> 登录并加入团队</Button>
    </section> : null}
  </AuthLayout>
}
