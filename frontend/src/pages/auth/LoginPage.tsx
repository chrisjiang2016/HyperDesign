import { Alert, Button, Checkbox, Form, Input, message } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AxiosError } from 'axios'
import { AuthLayout } from '@/layouts/AppLayouts'
import { AuthBrand } from '@/components/auth/authbrand'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

interface LoginFormValues { username: string; password: string; remember?: boolean }
type LoginTab = 'password' | 'phone'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((state) => state.setUser)
  const [activeTab, setActiveTab] = useState<LoginTab>('password')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from || '/'

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true); setError(null)
    try {
      const user = await login({ username: values.username, password: values.password })
      setUser(user); message.success('登录成功'); navigate(from, { replace: true })
    } catch (cause) {
      const response = (cause as AxiosError<{ message?: string }>).response
      setError(response?.data?.message || '登录失败，请检查网络后重试')
    } finally { setSubmitting(false) }
  }

  return <AuthLayout><div className="hd-auth">
    <AuthBrand title="欢迎使用 HyperDesign" description="登录你的账号，继续原型协作之旅" />
    <div className="hd-auth-card">
      <div className="hd-auth-tabs" role="tablist">
        <button type="button" role="tab" className={`hd-auth-tab${activeTab === 'password' ? ' is-active' : ''}`} onClick={() => setActiveTab('password')}>账号密码登录</button>
        <button type="button" role="tab" className={`hd-auth-tab${activeTab === 'phone' ? ' is-active' : ''}`} onClick={() => { setActiveTab('phone'); message.info('V1 暂不支持手机号登录') }}>手机号登录</button>
      </div>
      {error ? <div className="hd-auth-error" role="alert"><span>登录失败</span><span>{error}</span></div> : null}
      {activeTab === 'password' ? <Form<LoginFormValues> layout="vertical" requiredMark={false} initialValues={{ username: 'admin', password: 'Demo123456', remember: true }} onFinish={onFinish}>
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[A-Za-z0-9]{5,64}$/, message: '用户名为 5 位以上字母或数字' }]}><Input size="large" placeholder="请输入用户名" autoComplete="username" /></Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password size="large" placeholder="请输入密码" autoComplete="current-password" /></Form.Item>
        <div className="hd-auth-row"><Form.Item name="remember" valuePropName="checked" noStyle><Checkbox>记住我</Checkbox></Form.Item><Link to="/forgot-password" className="hd-auth-link">忘记密码？</Link></div>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting} className="hd-auth-primary-btn">登录</Button>
      </Form> : <Alert type="info" showIcon message="手机号登录" description="V1 暂不支持短信验证码，请使用账号密码登录。" style={{ marginBottom: 16 }} />}
      <div className="hd-auth-prompt">还没有账号？<Link to="/register">立即注册</Link></div>
    </div>
    <div className="hd-auth-demo-note"><strong>开发账号</strong><code>admin / Demo123456</code></div>
  </div></AuthLayout>
}
