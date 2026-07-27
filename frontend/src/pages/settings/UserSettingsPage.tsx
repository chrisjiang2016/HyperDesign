import { useState } from 'react'
import { Button, Form, Input, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { AppShellLayout } from '@/layouts/AppLayouts'
import { useAuthStore } from '@/store/authStore'
import { changePassword as requestPasswordChange, logout as requestLogout } from '@/api/auth'
import { AxiosError } from 'axios'

interface ProfileFormValues {
  name: string
  nickname: string
  bio: string
}

interface PasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function UserSettingsPage() {
  const navigate = useNavigate()
  const username = useAuthStore((state) => state.user?.username) || 'Admin'
  const logout = useAuthStore((state) => state.logout)
  const [profileForm] = Form.useForm<ProfileFormValues>()
  const [passwordForm] = Form.useForm<PasswordFormValues>()
  const [saved, setSaved] = useState(false)

  const displayName = username.length > 1 ? `${username} User` : 'Admin User'
  const email = `${username.toLowerCase()}@hyperdesign.io`

  const saveProfile = async () => {
    await profileForm.validateFields()
    setSaved(true)
    message.success('个人资料已保存')
    setTimeout(() => setSaved(false), 2500)
  }

  const changePassword = async (values: PasswordFormValues) => {
    try {
      await requestPasswordChange({ oldPassword: values.currentPassword, newPassword: values.newPassword, confirmNewPassword: values.confirmPassword })
      passwordForm.resetFields()
      logout()
      message.success('密码已修改，请重新登录')
      navigate('/login')
    } catch (cause) {
      message.error((cause as AxiosError<{ message?: string }>).response?.data?.message || '密码修改失败')
    }
  }

  const handleLogout = async () => {
    try { await requestLogout() } finally {
      logout()
      message.success('已退出登录')
      navigate('/login')
    }
  }

  return (
    <AppShellLayout
      breadcrumb={
        <>
          <span>工作台</span>
          <span>/</span>
          <span className="is-current">个人设置</span>
        </>
      }
      searchPlaceholder="搜索设置、快捷键..."
      rightbar={
        <aside className="hd-rightbar">
          <div className="hd-rightbar-section">
            <div className="hd-rightbar-title">账号概览</div>
            <div className="hd-account-summary">
              {[
                ['注册时间', '2025-08-12'],
                ['所属团队', '3 个'],
                ['创建项目', '12 个'],
                ['上传原型', '48 个'],
                ['最后登录', '今天 09:22'],
              ].map(([label, value]) => (
                <div key={label} className="hd-account-row">
                  <span className="label">{label}</span>
                  <span className="value">{value}</span>
                </div>
              ))}
            </div>
            <div className="hd-security-tip">
              <span>✅</span>
              <p>你的账号安全等级良好。两步验证已开启，建议每 90 天更换一次密码。</p>
            </div>
          </div>
          <div className="hd-rightbar-section">
            <div className="hd-rightbar-title">快捷操作</div>
            <div className="hd-info-card">
              <h4>💡 常用设置</h4>
              <ul className="hd-quick-links">
                <li>修改邮箱通知偏好</li>
                <li>管理已授权应用</li>
                <li>查看登录历史记录</li>
                <li>导出我的所有数据</li>
                <li>配置快捷键与主题</li>
              </ul>
            </div>
          </div>
        </aside>
      }
    >
      <div className="hd-page">
        <div className="hd-settings-header">
          <h1>个人设置</h1>
          <p>管理你的账号信息、安全设置和偏好配置。</p>
        </div>

        {saved ? <div className="hd-settings-alert">设置已保存</div> : null}

        <section className="hd-settings-card">
          <h2>👤 个人资料</h2>
          <div className="hd-avatar-section">
            <div className="hd-avatar-large">{username.slice(0, 1).toUpperCase()}</div>
            <div className="hd-avatar-meta">
              <h3>{displayName}</h3>
              <p>{email}</p>
              <span className="hd-team-role is-admin">管理员</span>
            </div>
            <div className="hd-avatar-actions">
              <Button className="hd-btn-secondary" onClick={() => message.info('更换头像（演示）')}>
                更换头像
              </Button>
              <Button type="text" onClick={() => message.info('移除头像（演示）')}>
                移除头像
              </Button>
            </div>
          </div>

          <Form<ProfileFormValues>
            form={profileForm}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              name: displayName,
              nickname: username,
              bio: '产品设计团队负责人，负责原型评审与协作流程。',
            }}
            onFinish={saveProfile}
          >
            <div className="hd-form-row">
              <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input />
              </Form.Item>
              <Form.Item label="昵称" name="nickname" rules={[{ required: true, message: '请输入昵称' }]}>
                <Input />
              </Form.Item>
            </div>
            <Form.Item label="邮箱地址">
              <Input value={email} disabled />
              <div className="hd-form-hint">邮箱账号不可修改，如需变更请联系管理员。</div>
            </Form.Item>
            <Form.Item label="个人简介" name="bio">
              <Input placeholder="简单介绍一下自己..." />
            </Form.Item>
            <div className="hd-button-group">
              <Button type="primary" htmlType="submit" className="hd-btn-primary">
                保存修改
              </Button>
              <Button className="hd-btn-secondary" onClick={() => profileForm.resetFields()}>
                取消
              </Button>
            </div>
          </Form>
        </section>

        <section className="hd-settings-card">
          <h2>🔐 安全设置</h2>
          <Form<PasswordFormValues>
            form={passwordForm}
            layout="vertical"
            requiredMark={false}
            onFinish={changePassword}
          >
            <Form.Item
              label="当前密码"
              name="currentPassword"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password placeholder="请输入当前密码" />
            </Form.Item>
            <div className="hd-form-row">
              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 8, message: '至少 8 位' },
                  {
                    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                    message: '需包含字母和数字',
                  },
                ]}
              >
                <Input.Password placeholder="至少8位，包含字母和数字" />
              </Form.Item>
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请再次输入新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="再次输入新密码" />
              </Form.Item>
            </div>
            <div className="hd-form-hint">
              建议使用大小写字母、数字和特殊字符组合，定期更换密码以保证账号安全。
            </div>
            <div className="hd-button-group">
              <Button type="primary" htmlType="submit" className="hd-btn-primary">
                修改密码
              </Button>
            </div>
          </Form>
        </section>

        <section className="hd-settings-card">
          <h2>📱 登录管理</h2>
          <div className="hd-settings-block">
            <div className="hd-settings-label">绑定手机号</div>
            <Input value="138****8888" disabled />
            <div className="hd-form-hint">当前手机号已通过验证。</div>
          </div>
          <div className="hd-settings-block">
            <div className="hd-settings-label">两步验证</div>
            <div className="hd-2fa-row">
              <span className="hd-2fa-ok">✅ 已开启</span>
              <Button className="hd-btn-secondary" onClick={() => message.info('管理两步验证（演示）')}>
                管理
              </Button>
            </div>
            <div className="hd-form-hint">使用 TOTP 验证器 App（如 Google Authenticator）进行二次验证。</div>
          </div>
        </section>

        <section className="hd-settings-card hd-settings-card--danger">
          <h2>⚠️ 危险操作</h2>
          <p className="hd-danger-desc">
            注销账号后，你的所有个人数据将被永久删除，且无法恢复。你创建的团队和项目将继续存在，但你将失去所有访问权限。
          </p>
          <div className="hd-button-group">
            <Button danger onClick={() => message.warning('申请注销账号（演示）')}>
              申请注销账号
            </Button>
            <Button className="hd-btn-secondary" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </section>
      </div>
    </AppShellLayout>
  )
}
