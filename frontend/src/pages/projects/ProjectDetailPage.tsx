import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Form, Input, Modal, Table, Upload, message } from 'antd'
import { EyeOutlined, FileZipOutlined, FolderAddOutlined, InboxOutlined, LockOutlined, SearchOutlined, ShareAltOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { createProjectFolder, getProjectDetail, getProjectDirectory, getProjectFilePermissions, getProjectFiles, retryProjectFileParse, updateProjectFilePermission, uploadProjectFile, type FilePermissionMember, type ProjectDetail, type ProjectFile, type ProjectFolder } from '@/api/workspace'
import { AppShellLayout } from '@/layouts/AppLayouts'
import { RightPanel } from '@/components/workspace/RightPanel'
import { PageEmpty, PageError, PageLoading } from '@/components/common/pagestates'

type UploadFormValues = { displayName?: string }
type FolderFormValues = { name: string }
type PermissionFlags = { canView: boolean; canComment: boolean; canEdit: boolean; canDelete: boolean }
const activities = [{ id: 'project-api', title: '项目文件已接入真实数据', summary: '上传 ZIP 后系统会后台解析页面目录，并自动刷新状态。' }]
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId = '' } = useParams()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [folders, setFolders] = useState<ProjectFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>()
  const [folderOpen, setFolderOpen] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [retryingFileId, setRetryingFileId] = useState<string | null>(null)
  const [permissionFile, setPermissionFile] = useState<ProjectFile | null>(null)
  const [permissionMembers, setPermissionMembers] = useState<FilePermissionMember[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [savingPermissionUserId, setSavingPermissionUserId] = useState<string | null>(null)
  const [form] = Form.useForm<UploadFormValues>()
  const [folderForm] = Form.useForm<FolderFormValues>()

  const loadProject = useCallback(async (showLoading = true) => {
    if (!projectId) return
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const [detail, nextFiles, directory] = await Promise.all([getProjectDetail(projectId), getProjectFiles(projectId), getProjectDirectory(projectId)])
      setProject(detail)
      setFiles(nextFiles)
      setFolders(directory.folders)
    } catch {
      setError('项目不存在，或你没有访问权限。')
      setProject(null); setFiles([]); setFolders([])
    } finally { if (showLoading) setLoading(false) }
  }, [projectId])

  useEffect(() => { void loadProject() }, [loadProject])
  const hasParsingFiles = files.some((file) => file.parseStatus === 'parsing')
  useEffect(() => {
    if (!hasParsingFiles) return
    const timer = window.setInterval(() => void loadProject(false), 2000)
    return () => window.clearInterval(timer)
  }, [hasParsingFiles, loadProject])

  const filteredFiles = useMemo(() => files.filter((file) => file.name.includes(keyword) || file.originalFilename.includes(keyword)), [files, keyword])

  const handleUpload = async () => {
    if (!selectedFile) { message.warning('请选择 ZIP 文件'); return }
    const values = await form.validateFields()
    setUploading(true)
    try {
      await uploadProjectFile(projectId, selectedFile, values.displayName, selectedFolderId)
      await loadProject(false)
      setUploadOpen(false); setSelectedFile(null); setSelectedFolderId(undefined); form.resetFields()
      message.success('ZIP 已上传，正在后台解析页面目录')
    } finally { setUploading(false) }
  }

  const handleCreateFolder = async () => {
    const values = await folderForm.validateFields()
    setCreatingFolder(true)
    try { await createProjectFolder(projectId, values); await loadProject(false); setFolderOpen(false); folderForm.resetFields(); message.success('文件夹已创建') }
    finally { setCreatingFolder(false) }
  }

  const handleRetryParse = async (fileId: string) => {
    setRetryingFileId(fileId)
    try { await retryProjectFileParse(projectId, fileId); await loadProject(false); message.success('已重新提交解析任务') }
    finally { setRetryingFileId(null) }
  }

  const openPermissionManager = async (file: ProjectFile) => {
    setPermissionFile(file); setPermissionsLoading(true)
    try { setPermissionMembers(await getProjectFilePermissions(projectId, file.id)) }
    catch { message.error('无法加载文件权限成员列表'); setPermissionFile(null) }
    finally { setPermissionsLoading(false) }
  }

  const updateMemberPermission = async (member: FilePermissionMember, key: keyof PermissionFlags, checked: boolean) => {
    if (!permissionFile) return
    const permissions = { ...member.permissions, [key]: checked }
    if ((key === 'canComment' || key === 'canEdit' || key === 'canDelete') && checked) permissions.canView = true
    if (key === 'canView' && !checked) { permissions.canComment = false; permissions.canEdit = false; permissions.canDelete = false }
    setSavingPermissionUserId(member.userId)
    try {
      await updateProjectFilePermission(projectId, permissionFile.id, member.userId, permissions)
      setPermissionMembers((items) => items.map((item) => item.userId === member.userId ? { ...item, permissions } : item))
    } catch { message.error('文件权限更新失败') }
    finally { setSavingPermissionUserId(null) }
  }

  const renderFileRow = (file: ProjectFile) => {
    const canPreview = file.parseStatus === 'success'
    const stateText = file.parseStatus === 'success' ? '解析完成' : file.parseStatus === 'parsing' ? '解析中' : '解析失败'
    return <div key={file.id} className="hd-asset-row" role={canPreview ? 'button' : undefined} tabIndex={canPreview ? 0 : undefined} onClick={() => canPreview && navigate(`/files/${file.id}/preview`)}>
      <div className="hd-asset-main"><div className="hd-asset-icon"><FileZipOutlined /></div><div className="hd-asset-info"><div className="hd-asset-title">{file.name}</div><div className="hd-asset-desc">{file.originalFilename} · 上传人：{file.uploader}</div><div className="hd-asset-meta"><span>{file.parseStatus === 'success' ? `${file.pageCount} 个页面` : file.parseStatus === 'parsing' ? '正在扫描页面目录…' : '无法读取页面目录'}</span><span>{formatDate(file.updatedAt)}</span><span className={`hd-status-tag${canPreview ? ' is-done' : ' is-review'}`}>{stateText}</span></div>{file.parseStatus === 'failed' ? <div className="hd-parse-error">{file.parseError ?? '无法解析该 ZIP 文件'} <Button size="small" loading={retryingFileId === file.id} disabled={project?.permission !== 'edit'} onClick={(event) => { event.stopPropagation(); void handleRetryParse(file.id) }}>重新解析</Button></div> : null}</div></div>
      <div className="hd-asset-actions">{canPreview ? <button type="button" className="hd-icon-btn" title="预览" aria-label={`预览 ${file.name}`} onClick={(event) => { event.stopPropagation(); navigate(`/files/${file.id}/preview`) }}><EyeOutlined /></button> : null}{canPreview && project?.permission === 'edit' ? <button type="button" className="hd-icon-btn" title="管理分享" aria-label={`管理 ${file.name} 的分享链接`} onClick={(event) => { event.stopPropagation(); navigate(`/files/${file.id}/preview?share=manage`) }}><ShareAltOutlined /></button> : null}{project?.permission === 'edit' ? <button type="button" className="hd-icon-btn" title="文件权限" aria-label={`管理 ${file.name} 的文件权限`} onClick={(event) => { event.stopPropagation(); void openPermissionManager(file) }}><LockOutlined /></button> : null}</div>
    </div>
  }

  return <AppShellLayout breadcrumb={<><span>我的团队</span><span>/</span><span>{project?.teamName ?? '项目'}</span><span>/</span><span className="is-current">{project?.name ?? '项目详情'}</span></>} searchPlaceholder="搜索项目或文件" rightbar={<RightPanel title="项目动态" activities={activities} />}>
    <div className="hd-page">
      {error ? <PageError title="项目详情加载失败" description={error} action={{ label: '重新加载', onClick: () => void loadProject() }} /> : null}
      {loading ? <PageLoading label="正在加载项目与原型资产" /> : null}
      {project ? <>
        <section className="hd-hero-panel hd-project-hero"><div className="hd-project-header-row"><div><div className="hd-project-kicker">项目工作台</div><h1>{project.name}</h1><p>{project.description}</p></div><div className="hd-hero-actions"><Button className="hd-btn-secondary" disabled title="分享链接按原型文件创建，请在对应文件的操作栏中管理"><ShareAltOutlined /> 分享原型</Button><Button type="primary" className="hd-btn-primary" disabled={project.permission !== 'edit'} title={project.permission === 'edit' ? '上传 HTML 或 Axure 导出的 ZIP 原型文件' : '当前账号只有查看权限，无法上传文件'} onClick={() => { setSelectedFolderId(undefined); setUploadOpen(true) }}><UploadOutlined /> {project.permission === 'edit' ? '上传 ZIP' : '仅查看权限'}</Button></div></div>{project.permission !== 'edit' ? <Alert className="hd-project-permission-note" type="info" showIcon message="当前账号仅拥有查看权限，不能上传、创建文件夹或修改文件权限。请使用项目编辑者账号登录。" /> : null}<div className="hd-team-meta-row"><span className="hd-meta-pill"><FileZipOutlined /> {project.stats.fileCount} 个原型文件</span><span className="hd-meta-pill">{project.stats.collaboratorCount} 位协作者</span><span className="hd-meta-pill">{project.stats.pendingCommentCount} 条待处理评论</span><span className="hd-meta-pill">{project.stats.pageCountEstimate} 个页面</span></div></section>
        <section className="hd-section-panel"><div className="hd-page-toolbar"><div><h2>原型资产</h2><p>文件来自当前项目的真实 ZIP 解析结果，可直接进入在线预览。</p></div><div className="hd-toolbar-actions"><Button className="hd-btn-secondary" disabled={project.permission !== 'edit'} onClick={() => setFolderOpen(true)}><FolderAddOutlined /> 新建文件夹</Button><Button className="hd-btn-secondary" disabled={project.permission !== 'edit'} onClick={() => { setSelectedFolderId(undefined); setUploadOpen(true) }}><UploadOutlined /> 上传 HTML 原型 ZIP</Button></div></div><div className="hd-asset-toolbar"><label className="hd-search-box"><SearchOutlined aria-hidden="true" /><Input variant="borderless" placeholder="搜索文件名" value={keyword} onChange={(e) => setKeyword(e.target.value)} allowClear /></label>{hasParsingFiles ? <span className="hd-parse-polling">正在自动刷新解析进度…</span> : null}</div>{folders.map((folder) => <div key={folder.id} className="hd-folder-block"><div className="hd-folder-heading"><FolderAddOutlined /> {folder.name} <span>{folder.files.length} 个文件</span><Button size="small" disabled={project.permission !== 'edit'} onClick={() => { setSelectedFolderId(folder.id); setUploadOpen(true) }}><UploadOutlined /> 上传到此处</Button></div><div className="hd-asset-list">{folder.files.filter((file) => filteredFiles.some((current) => current.id === file.id)).map(renderFileRow)}</div></div>)}<div className="hd-asset-list">{filteredFiles.filter((file) => !file.folderId).map(renderFileRow)}{filteredFiles.length === 0 ? <PageEmpty variant="files" title={keyword ? '没有匹配的原型文件' : '当前项目还没有原型文件'} description={keyword ? '请调整搜索关键词后重试。' : '上传 HTML 或 Axure 导出的 ZIP 后，系统会自动生成页面目录与受控预览。'} action={!keyword && project.permission === 'edit' ? { label: '上传 ZIP', onClick: () => { setSelectedFolderId(undefined); setUploadOpen(true) } } : undefined} /> : null}</div><button type="button" className="hd-dropzone" disabled={project.permission !== 'edit'} onClick={() => { setSelectedFolderId(undefined); setUploadOpen(true) }}><div className="hd-dropzone__emoji"><InboxOutlined /></div><h3>上传 ZIP 原型文件</h3><p>系统会自动校验、解析页面目录并生成受控在线预览。</p></button></section>
      </> : null}
    </div>
    <Modal centered title="上传原型 ZIP" open={uploadOpen} onCancel={() => setUploadOpen(false)} onOk={handleUpload} okText="上传并解析" cancelText="取消" okButtonProps={{ className: 'hd-btn-primary', loading: uploading }}><Form form={form} layout="vertical" requiredMark={false}>{selectedFolderId ? <div className="hd-upload-folder-hint">上传位置：已选文件夹</div> : null}<Form.Item label="显示名称" name="displayName"><Input placeholder="留空则使用 ZIP 文件名" /></Form.Item><Form.Item label="选择 ZIP 文件" required><Upload accept=".zip,application/zip" maxCount={1} beforeUpload={(file) => { setSelectedFile(file); return false }} onRemove={() => { setSelectedFile(null); return true }} fileList={selectedFile ? [{ uid: selectedFile.name, name: selectedFile.name, status: 'done' } as UploadFile] : []}><Button>选择 ZIP 文件</Button></Upload></Form.Item></Form></Modal>
    <Modal centered title="新建文件夹" open={folderOpen} onCancel={() => setFolderOpen(false)} onOk={handleCreateFolder} okText="创建" cancelText="取消" okButtonProps={{ className: 'hd-btn-primary', loading: creatingFolder }}><Form form={folderForm} layout="vertical" requiredMark={false}><Form.Item label="文件夹名称" name="name" rules={[{ required: true, message: '请输入文件夹名称' }]}><Input placeholder="例如：移动端设计" /></Form.Item></Form></Modal>
    <Modal centered width={760} title={`文件权限 · ${permissionFile?.name ?? ''}`} open={Boolean(permissionFile)} onCancel={() => setPermissionFile(null)} footer={<Button onClick={() => setPermissionFile(null)}>关闭</Button>}>
      <p>仅团队管理员或拥有项目编辑权限的成员可调整。关闭“查看”会自动移除该成员的评论、编辑和删除能力。</p>
      <Table<FilePermissionMember> rowKey="userId" size="small" loading={permissionsLoading} pagination={false} dataSource={permissionMembers} columns={[
        { title: '成员', dataIndex: 'username', render: (name, item) => <span>{name} {item.isUploader ? '（上传者）' : ''}</span> },
        { title: '角色', dataIndex: 'role' },
        ...(['canView', 'canComment', 'canEdit', 'canDelete'] as const).map((key) => ({ title: ({ canView: '查看', canComment: '评论', canEdit: '编辑', canDelete: '删除' }[key]), align: 'center' as const, render: (_: unknown, item: FilePermissionMember) => <Checkbox checked={item.permissions[key]} disabled={item.isUploader || savingPermissionUserId === item.userId} onChange={(event) => void updateMemberPermission(item, key, event.target.checked)} /> })),
      ]} />
    </Modal>
  </AppShellLayout>
}
