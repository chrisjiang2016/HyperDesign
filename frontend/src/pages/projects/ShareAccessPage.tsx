import { Button } from 'antd'
import { CheckCircleOutlined, LoginOutlined, ShareAltOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AppLayouts'
import { PageError, PageLoading } from '@/components/common/pagestates'
import { acceptShareLink, inspectShareLink } from '@/api/workspace'
import { getCurrentUser } from '@/api/auth'

type ShareInfo = {
  file: { id: string; name: string; pageCount: number; projectName: string }
  expiresAt: string
}

export function ShareAccessPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [share, setShare] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const loadShare = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!token) throw new Error('缺少分享令牌')
      setShare(await inspectShareLink(token))
    } catch {
      setShare(null)
      setError('这个分享链接无效、已过期或已被撤销。')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void loadShare() }, [loadShare])

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
      const result = await acceptShareLink(token)
      navigate(`/files/${result.fileId}/preview`, { replace: true })
    } catch {
      setError('接受分享失败，链接可能已失效。请重新打开分享链接后重试。')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <AuthLayout>
      {loading ? <PageLoading label="正在验证分享链接" /> : null}
      {error ? <PageError title="无法打开分享" description={error} action={{ label: '重新验证', onClick: () => void loadShare() }} /> : null}
      {share && !error ? (
        <section className="hd-share-access-card">
          <div className="hd-share-access-card__icon"><ShareAltOutlined /></div>
          <span className="hd-share-access-card__eyebrow">HyperDesign 原型分享</span>
          <h1>{share.file.name}</h1>
          <p>{share.file.projectName} · {share.file.pageCount} 个页面</p>
          <div className="hd-share-access-card__notice">
            <CheckCircleOutlined /> 接受后可获得此原型的只读预览权限，不包含评论、编辑或删除权限。
          </div>
          <p className="hd-share-access-card__expiry">链接有效至：{new Date(share.expiresAt).toLocaleString('zh-CN', { hour12: false })}</p>
          <Button type="primary" className="hd-btn-primary" block loading={accepting} onClick={() => void accept()}>
            <LoginOutlined /> 登录并接受分享
          </Button>
        </section>
      ) : null}
    </AuthLayout>
  )
}
