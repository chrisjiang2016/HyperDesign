import { Button, Checkbox, Form, Input, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { AuthLayout } from '@/layouts/AppLayouts'
import { AuthBrand } from '@/components/auth/authbrand'
import { register } from '@/api/auth'

interface RegisterFormValues { username: string; confirmUsername: string; password: string; passwordConfirm: string; agreement: boolean }
function getPasswordStrength(password: string) { const score = Number(password.length >= 6) + Number(/[A-Za-z]/.test(password)) + Number(/\d/.test(password)) + Number(password.length >= 12); return { score, label: ['弱', '弱', '中等', '强', '很强'][score] } }

export function RegisterPage() {
  const navigate = useNavigate(); const [form] = Form.useForm<RegisterFormValues>(); const [password, setPassword] = useState(''); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null); const strength = useMemo(() => getPasswordStrength(password), [password])
  const onFinish = async (values: RegisterFormValues) => {
    setSubmitting(true); setError(null)
    try { await register({ username: values.username, confirmUsername: values.confirmUsername, password: values.password }); message.success('注册成功，请登录'); navigate('/login', { replace: true }) }
    catch (cause) { setError((cause as AxiosError<{ message?: string }>).response?.data?.message || '注册失败，请稍后重试') }
    finally { setSubmitting(false) }
  }
  return <AuthLayout><div className="hd-auth">
    <AuthBrand title="创建你的账号" description="加入 HyperDesign，开启高效原型协作" />
    <div className="hd-auth-card">{error ? <div className="hd-auth-error" role="alert"><span>注册失败</span><span>{error}</span></div> : null}<Form<RegisterFormValues> form={form} layout="vertical" requiredMark={false} initialValues={{ agreement: true }} onFinish={onFinish}>
      <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[A-Za-z0-9]{5,64}$/, message: '用户名为 5-64 位英文字母或数字' }]}><Input size="large" placeholder="例如 chrisj" autoComplete="username" /></Form.Item>
      <Form.Item label="确认用户名" name="confirmUsername" dependencies={['username']} rules={[{ required: true, message: '请确认用户名' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue('username') === value ? Promise.resolve() : Promise.reject(new Error('两次用户名输入不一致')) })]}><Input size="large" placeholder="再次输入用户名" /></Form.Item>
      <Form.Item label="设置密码" name="password" rules={[{ required: true, message: '请设置密码' }, { pattern: /^[A-Za-z0-9]{6,128}$/, message: '密码为至少 6 位英文字母或数字' }]}><Input.Password size="large" placeholder="至少6位，包含字母或数字" autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} /></Form.Item>
      <div className="hd-password-strength" aria-hidden={!password}>{[0, 1, 2, 3].map((idx) => <div key={idx} className={`hd-password-strength__bar${strength.score > idx ? ' is-active' : ''}`} />)}</div><div className="hd-password-strength__text">密码强度：{password ? strength.label : '请输入密码'}</div>
      <Form.Item label="确认密码" name="passwordConfirm" dependencies={['password']} rules={[{ required: true, message: '请再次输入密码' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')) })]}><Input.Password size="large" placeholder="再次输入密码" autoComplete="new-password" /></Form.Item>
      <Form.Item name="agreement" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请先同意服务条款与隐私政策')) }]}><Checkbox className="hd-auth-agreement">我已阅读并同意 <a href="#">服务条款</a> 和 <a href="#">隐私政策</a>。</Checkbox></Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={submitting} className="hd-auth-primary-btn">注册账号</Button>
    </Form><div className="hd-auth-prompt">已有账号？<Link to="/login">立即登录</Link></div></div>
  </div></AuthLayout>
}
