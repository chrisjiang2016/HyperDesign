import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { PageLoading } from '@/components/common/pagestates'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })))
const TeamsPage = lazy(() => import('@/pages/teams/TeamsPage').then(({ TeamsPage }) => ({ default: TeamsPage })))
const TeamDetailPage = lazy(() => import('@/pages/teams/TeamDetailPage').then(({ TeamDetailPage }) => ({ default: TeamDetailPage })))
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage').then(({ ProjectDetailPage }) => ({ default: ProjectDetailPage })))
const PrototypeViewerPage = lazy(() => import('@/pages/projects/PrototypeViewerPage').then(({ PrototypeViewerPage }) => ({ default: PrototypeViewerPage })))
const ShareAccessPage = lazy(() => import('@/pages/projects/ShareAccessPage').then(({ ShareAccessPage }) => ({ default: ShareAccessPage })))
const UserSettingsPage = lazy(() => import('@/pages/settings/UserSettingsPage').then(({ UserSettingsPage }) => ({ default: UserSettingsPage })))

const withRouteLoader = (element: ReactNode) => <Suspense fallback={<PageLoading label="正在加载页面" />}>{element}</Suspense>
const protectedRoute = (element: ReactNode) => <RequireAuth>{withRouteLoader(element)}</RequireAuth>

export const router = createBrowserRouter([
  { path: '/', element: protectedRoute(<TeamsPage />) },
  { path: '/login', element: withRouteLoader(<LoginPage />) },
  { path: '/register', element: withRouteLoader(<RegisterPage />) },
  { path: '/forgot-password', element: withRouteLoader(<ForgotPasswordPage />) },
  { path: '/teams/:teamId', element: protectedRoute(<TeamDetailPage />) },
  { path: '/projects/:projectId', element: protectedRoute(<ProjectDetailPage />) },
  { path: '/files/:fileId/preview', element: protectedRoute(<PrototypeViewerPage />) },
  { path: '/shares/:token', element: withRouteLoader(<ShareAccessPage />) },
  { path: '/settings', element: protectedRoute(<UserSettingsPage />) },
  { path: '*', element: <Navigate to="/" replace /> },
])
