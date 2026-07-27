import { Alert, Button, Form, Input, message } from 'antd'
import { CheckOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AxiosError } from 'axios'
import { AuthLayout } from '@/layouts/AppLayouts'
import { AuthBrand } from '@/components/auth/authbrand'
import { resetPassword } from '@/api/auth'

interface ResetValues { username: string }
export function ForgotPasswordPage() {
  const navigate = useNavigate(); const [form] = Form.useForm<ResetValues>(); const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false)
  const onFinish = async (values: ResetValues) => {
    setSubmitting(true)
    try { const result = await resetPassword(values.username); setTemporaryPassword(result?.temporaryPassword ?? null); if (!result) message.success('若账号存在，密码已重置') }
    catch (cause) { message.error((cause as AxiosError<{ message?: string }>).response?.data?.message || '重置失败，请稍后重试') }
    finally { setSubmitting(false) }
  }
  return <AuthLayout><div className="hd-auth">
    <AuthBrand title="重置你的密码" description="验证用户名后获取临时密码，登录后请及时修改。" />
    <div className="hd-auth-card">{temporaryPassword ? <div className="hd-auth-success"><div className="hd-auth-success__icon"><CheckOutlined /></div><h2>密码已重置</h2><p>请妥善保存以下临时密码，并在登录后立即修改：</p><Alert type="warning" showIcon message={temporaryPassword} style={{ marginBottom: 18, fontFamily: 'monospace', fontSize: 18 }} /><Button type="primary" size="large" block className="hd-auth-primary-btn" onClick={() => navigate('/login')}>前往登录</Button></div> : <><div className="hd-auth-tip"><InfoCircleOutlined aria-hidden="true" /><span>请输入注册用户名。系统会生成临时密码并使原登录会话失效。</span></div><Form<ResetValues> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}><Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[A-Za-z0-9]{5,64}$/, message: '用户名为 5 位以上字母或数字' }]}><Input size="large" placeholder="请输入注册用户名" autoComplete="username" /></Form.Item><Button type="primary" htmlType="submit" size="large" block loading={submitting} className="hd-auth-primary-btn">生成临时密码</Button></Form><div className="hd-auth-prompt">想起密码了？<Link to="/login">返回登录</Link></div></>}</div>
  </div></AuthLayout>
}
