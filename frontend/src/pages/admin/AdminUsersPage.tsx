import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Table, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { AppShellLayout } from '@/layouts/AppLayouts'
import { PageEmpty, PageError, PageLoading } from '@/components/common/pagestates'
import { deleteUser, listUsers, createUser, updateUser, type AdminUser } from '@/api/admin'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'

const roleLabels: Record<AdminUser['role'], string> = {
  super_admin: '超级管理员',
  sub_admin: '子管理员',
  employee: '普通成员',
}

const statusLabels: Record<AdminUser['status'], string> = {
  active: '正常',
  disabled: '已禁用',
}

type CreateValues = { username: string; password: string; role: AdminUser['role']; status: AdminUser['status'] }
type EditValues = { role: AdminUser['role']; status: AdminUser['status']; password?: string }

export function AdminUsersPage() {
  const currentUser = useAuthStore((state) => state.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createForm] = Form.useForm<CreateValues>()
  const [editForm] = Form.useForm<EditValues>()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch {
      setError('用户列表加载失败，请确认后端服务已启动后重试。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = async () => {
    const values = await createForm.validateFields()
    setSubmitting(true)
    try {
      await createUser(values)
      message.success('用户已创建')
      setCreateOpen(false)
      createForm.resetFields()
      await load()
    } catch (err: any) {
      message.error(err.response?.data?.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    editForm.setFieldsValue({ role: user.role, status: user.status, password: undefined })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editing) return
    const values = await editForm.validateFields()
    setSubmitting(true)
    try {
      const payload: EditValues = { role: values.role, status: values.status }
      if (values.password) payload.password = values.password
      await updateUser(editing.id, payload)
      message.success('用户已更新')
      setEditOpen(false)
      setEditing(null)
      await load()
    } catch (err: any) {
      message.error(err.response?.data?.message || '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (user: AdminUser) => {
    Modal.confirm({
      centered: true,
      title: `删除用户"${user.username}"`,
      content: '该用户的所有会话将被强制退出，且无法恢复。',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUser(user.id)
          message.success('用户已删除')
          await load()
        } catch (err: any) {
          message.error(err.response?.data?.message || '删除失败')
        }
      },
    })
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: AdminUser['role']) => <Tag color={role === 'super_admin' ? 'red' : role === 'sub_admin' ? 'blue' : 'default'}>{roleLabels[role]}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: AdminUser['status']) => <Tag color={status === 'active' ? 'green' : 'default'}>{statusLabels[status]}</Tag>,
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (value?: string | null) => (value ? new Date(value).toLocaleString('zh-CN') : '从未登录'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: AdminUser) => (
        <div className="hd-member-actions">
          <Button type="link" onClick={() => openEdit(record)} disabled={record.username === 'system' && currentUser?.username !== 'system'}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)} disabled={record.username === 'system'}>
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <AppShellLayout
      breadcrumb={
        <>
          <Link to="/admin/users">系统管理</Link>
          <span>/</span>
          <span className="is-current">账号管理</span>
        </>
      }
      searchPlaceholder="搜索用户名"
    >
      <div className="hd-page">
        {error ? <PageError title="加载失败" description={error} action={{ label: '重新加载', onClick: () => void load() }} /> : null}
        {!error ? (
          <section className="hd-section-panel">
            <div className="hd-page-toolbar">
              <div>
                <h2>全部账号</h2>
                <p>以超级管理员视角查看、新建、禁用与删除所有登录账号。</p>
              </div>
              <Button type="primary" className="hd-btn-primary" onClick={() => setCreateOpen(true)}>
                <PlusOutlined /> 新建账号
              </Button>
            </div>

            {loading ? (
              <PageLoading label="正在加载账号列表" />
            ) : users.length === 0 ? (
              <PageEmpty variant="files" title="还没有账号" description="创建第一个账号后，即可分配给团队成员使用。" action={{ label: '新建账号', onClick: () => setCreateOpen(true) }} />
            ) : (
              <Table rowKey="id" columns={columns} dataSource={users} pagination={false} />
            )}
          </section>
        ) : null}
      </div>

      <Modal
        centered
        title="新建账号"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ className: 'hd-btn-primary', loading: submitting }}
      >
        <Form form={createForm} layout="vertical" requiredMark={false} initialValues={{ role: 'employee', status: 'active' }}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名（5-64 位字母或数字）' }, { pattern: /^[A-Za-z0-9]{5,64}$/, message: '用户名需为 5-64 位英文字母或数字' }]}>
            <Input placeholder="例如：alice01" />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, message: '请输入密码（6-128 位字母或数字）' }, { pattern: /^[A-Za-z0-9]{6,128}$/, message: '密码需为 6-128 位英文字母或数字' }]}>
            <Input.Password placeholder="例如：Pass123456" />
          </Form.Item>
          <Form.Item label="角色" name="role">
            <Select
              options={[
                { value: 'employee', label: '普通成员' },
                { value: 'sub_admin', label: '子管理员' },
                { value: 'super_admin', label: '超级管理员' },
              ]}
            />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { value: 'active', label: '正常' },
                { value: 'disabled', label: '已禁用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        centered
        title={`编辑账号"${editing?.username ?? ''}"`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEdit}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ className: 'hd-btn-primary', loading: submitting }}
      >
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item label="角色" name="role">
            <Select
              options={[
                { value: 'employee', label: '普通成员' },
                { value: 'sub_admin', label: '子管理员' },
                { value: 'super_admin', label: '超级管理员' },
              ]}
            />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { value: 'active', label: '正常' },
                { value: 'disabled', label: '已禁用' },
              ]}
            />
          </Form.Item>
          <Form.Item label="重置密码" name="password" extra="留空表示不修改密码">
            <Input.Password placeholder="可选，6-128 位字母或数字" />
          </Form.Item>
        </Form>
      </Modal>
    </AppShellLayout>
  )
}
