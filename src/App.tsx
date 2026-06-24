import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ToastContainer } from '@/components/ui/Toast'
import CookieBanner from '@/components/consent/CookieBanner'
import { useAnalytics } from '@/hooks/useAnalytics'

// Layout
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AuthCallback from '@/pages/auth/AuthCallback'

// Páginas públicas
import Landing from '@/pages/Landing'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import LgpdConsent from '@/pages/auth/LgpdConsent'

// Páginas autenticadas
import Feed from '@/pages/Feed'
import Profile from '@/pages/Profile'
import EditProfile from '@/pages/EditProfile'
import Connections from '@/pages/Connections'
import GroupList from '@/pages/groups/GroupList'
import GroupDetail from '@/pages/groups/GroupDetail'
import CreateGroup from '@/pages/groups/CreateGroup'
import GroupEdit from '@/pages/groups/GroupEdit'
import ProjectList from '@/pages/projects/ProjectList'
import ProjectDetail from '@/pages/projects/ProjectDetail'
import CreateProject from '@/pages/projects/CreateProject'
import EditProject from '@/pages/projects/EditProject'
import Messages from '@/pages/Messages'
import Notifications from '@/pages/Notifications'
import Search from '@/pages/Search'
import AccountSettings from '@/pages/settings/AccountSettings'
import PrivacySettings from '@/pages/settings/PrivacySettings'
import LgpdSettings from '@/pages/settings/LgpdSettings'
import NotFound from '@/pages/NotFound'

export default function App() {
  const { initialize, initialized, session, profile } = useAuthStore()
  useAnalytics()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Tela de carregamento enquanto verifica a sessão
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando…</span>
        </div>
      </div>
    )
  }

  return (
    <>
    <ToastContainer />
    <CookieBanner />
    <Routes>
      {/* Callback OAuth — deve ser acessível sem autenticação */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Rotas públicas — redireciona para feed se já logado */}
      <Route
        path="/"
        element={session ? <Navigate to="/feed" replace /> : <Landing />}
      />
      <Route
        path="/login"
        element={session ? <Navigate to="/feed" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={session ? <Navigate to="/feed" replace /> : <Register />}
      />

      {/* Aceite LGPD — logado mas sem consentimento */}
      <Route
        path="/lgpd-consent"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : profile?.lgpd_accepted_at ? (
            <Navigate to="/feed" replace />
          ) : (
            <LgpdConsent />
          )
        }
      />

      {/* Rotas autenticadas dentro do layout principal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/perfil/:username" element={<Profile />} />
          <Route path="/perfil/editar" element={<EditProfile />} />
          <Route path="/conexoes" element={<Connections />} />
          <Route path="/grupos" element={<GroupList />} />
          <Route path="/grupos/criar" element={<CreateGroup />} />
          <Route path="/grupos/:id" element={<GroupDetail />} />
          <Route path="/grupos/:id/editar" element={<GroupEdit />} />
          <Route path="/projetos" element={<ProjectList />} />
          <Route path="/projetos/criar" element={<CreateProject />} />
          <Route path="/projetos/:id" element={<ProjectDetail />} />
          <Route path="/projetos/:id/editar" element={<EditProject />} />
          <Route path="/mensagens" element={<Messages />} />
          <Route path="/mensagens/:userId" element={<Messages />} />
          <Route path="/notificacoes" element={<Notifications />} />
          <Route path="/buscar" element={<Search />} />
          <Route path="/configuracoes" element={<AccountSettings />} />
          <Route path="/configuracoes/privacidade" element={<PrivacySettings />} />
          <Route path="/configuracoes/lgpd" element={<LgpdSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}
