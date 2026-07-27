import { PrismaClient, ProjectPermissionLevel, SystemRole, TeamRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await argon2.hash('Demo123456')

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      role: SystemRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: 'admin',
      passwordHash,
      role: SystemRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  })

  const chrisj = await prisma.user.upsert({
    where: { username: 'chrisj' },
    update: { passwordHash, role: SystemRole.EMPLOYEE, status: UserStatus.ACTIVE },
    create: {
      username: 'chrisj',
      passwordHash,
      role: SystemRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  })

  const mia = await prisma.user.upsert({
    where: { username: 'mia001' },
    update: { passwordHash, role: SystemRole.EMPLOYEE, status: UserStatus.ACTIVE },
    create: {
      username: 'mia001',
      passwordHash,
      role: SystemRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  })

  const leo = await prisma.user.upsert({
    where: { username: 'leo001' },
    update: { passwordHash, role: SystemRole.EMPLOYEE, status: UserStatus.ACTIVE },
    create: {
      username: 'leo001',
      passwordHash,
      role: SystemRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  })

  const team1 = await prisma.team.upsert({
    where: { id: 'team-1' },
    update: {
      name: '产品设计团队',
      description: '负责产品原型设计、评审协同与研发交付，当前重点项目为电商平台改版与 CRM 系统升级。',
      icon: '📐',
      color: '#6366f1',
    },
    create: {
      id: 'team-1',
      name: '产品设计团队',
      description: '负责产品原型设计、评审协同与研发交付，当前重点项目为电商平台改版与 CRM 系统升级。',
      icon: '📐',
      color: '#6366f1',
    },
  })

  const team2 = await prisma.team.upsert({
    where: { id: 'team-2' },
    update: {
      name: '技术研发团队',
      description: '重点跟进原型实现、样式还原与前端联调，当前有多个高保真原型等待研发评估。',
      icon: '🛠',
      color: '#10b981',
    },
    create: {
      id: 'team-2',
      name: '技术研发团队',
      description: '重点跟进原型实现、样式还原与前端联调，当前有多个高保真原型等待研发评估。',
      icon: '🛠',
      color: '#10b981',
    },
  })

  const team3 = await prisma.team.upsert({
    where: { id: 'team-3' },
    update: {
      name: 'UI / UX 设计组',
      description: '沉淀视觉规范、体验评审与设计协作，支持原型方案的视觉打磨和设计验收。',
      icon: '🎨',
      color: '#f59e0b',
    },
    create: {
      id: 'team-3',
      name: 'UI / UX 设计组',
      description: '沉淀视觉规范、体验评审与设计协作，支持原型方案的视觉打磨和设计验收。',
      icon: '🎨',
      color: '#f59e0b',
    },
  })

  const team4 = await prisma.team.upsert({
    where: { id: 'team-4' },
    update: {
      name: '数据分析协作组',
      description: '负责数据看板、大屏可视化和业务分析类原型，强调数据逻辑与展示表现的统一。',
      icon: '📊',
      color: '#2563eb',
    },
    create: {
      id: 'team-4',
      name: '数据分析协作组',
      description: '负责数据看板、大屏可视化和业务分析类原型，强调数据逻辑与展示表现的统一。',
      icon: '📊',
      color: '#2563eb',
    },
  })

  const teamMemberships = [
    { teamId: team1.id, userId: admin.id, role: TeamRole.ADMIN, canUpload: true },
    { teamId: team1.id, userId: chrisj.id, role: TeamRole.MEMBER, canUpload: true },
    { teamId: team2.id, userId: chrisj.id, role: TeamRole.MEMBER, canUpload: false },
    { teamId: team2.id, userId: mia.id, role: TeamRole.ADMIN, canUpload: true },
    { teamId: team3.id, userId: chrisj.id, role: TeamRole.MEMBER, canUpload: false },
    { teamId: team3.id, userId: leo.id, role: TeamRole.ADMIN, canUpload: true },
    { teamId: team4.id, userId: admin.id, role: TeamRole.ADMIN, canUpload: true },
  ]

  for (const membership of teamMemberships) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: membership.teamId, userId: membership.userId } },
      update: membership,
      create: membership,
    })
  }

  const projects = [
    { id: 'project-1', teamId: team1.id, name: '电商平台改版', description: '移动端购物体验优化，提升用户转化率' },
    { id: 'project-2', teamId: team1.id, name: '客户管理系统', description: 'CRM 系统原型设计' },
    { id: 'project-3', teamId: team1.id, name: '数据可视化大屏', description: '运营数据实时展示' },
    { id: 'project-4', teamId: team1.id, name: '移动端 APP V3.0', description: '新版本交互设计' },
    { id: 'project-5', teamId: team2.id, name: '组件库升级', description: '统一 B 端视觉规范' },
    { id: 'project-6', teamId: team2.id, name: '品牌官网重构', description: '官网体验改版与品牌强化' },
    { id: 'project-7', teamId: team3.id, name: '业务协同平台', description: '跨团队流程管理优化' },
    { id: 'project-8', teamId: team4.id, name: '经营分析大屏', description: '经营指标可视化' },
  ]

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: project,
    })
  }

  const permissions = [
    { projectId: 'project-1', userId: chrisj.id, level: ProjectPermissionLevel.EDIT, grantedById: admin.id },
    { projectId: 'project-2', userId: chrisj.id, level: ProjectPermissionLevel.VIEW, grantedById: admin.id },
    { projectId: 'project-4', userId: chrisj.id, level: ProjectPermissionLevel.EDIT, grantedById: admin.id },
    { projectId: 'project-5', userId: chrisj.id, level: ProjectPermissionLevel.VIEW, grantedById: mia.id },
    { projectId: 'project-7', userId: chrisj.id, level: ProjectPermissionLevel.EDIT, grantedById: leo.id },
  ]

  for (const permission of permissions) {
    await prisma.projectPermission.upsert({
      where: { projectId_userId: { projectId: permission.projectId, userId: permission.userId } },
      update: permission,
      create: permission,
    })
  }

  console.log('Seed complete: admin / Demo123456; chrisj / Demo123456')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())
