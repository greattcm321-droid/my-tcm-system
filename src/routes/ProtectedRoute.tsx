import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'

interface Props {
    allowedRoles?: UserRole[]
}

/**
 * ProtectedRoute v3 — Supabase Realtime RBAC
 * - 驗證 Supabase session（取代舊 Firebase currentUser）
 * - 驗證角色權限 (allowedRoles)
 * - super_admin 不受 clinicId 限制，可存取所有租戶
 */
export default function ProtectedRoute({ allowedRoles }: Props) {
    const { session, userProfile, loading } = useAuth()

    if (loading) return <LoadingSpinner fullScreen />
    if (!session) return <Navigate to="/login" replace />

    if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
        return <Navigate to="/" replace />
    }

    // super_admin 不需要 clinicId 驗證
    if (
        userProfile &&
        userProfile.role !== 'super_admin' &&
        !userProfile.clinicId
    ) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}
