import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function ProtectedRoute() {
  const { session, profile } = useAuthStore()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Usuário logado mas ainda não aceitou os termos LGPD
  if (profile && !profile.lgpd_accepted_at) {
    return <Navigate to="/lgpd-consent" replace />
  }

  return <Outlet />
}
