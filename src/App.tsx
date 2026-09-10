import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ConsultationProvider } from './contexts/ConsultationContext'
import ProtectedRoute from './routes/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Pages
import Login from './pages/Login'

// SuperAdmin
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import ClinicManagement from './pages/superadmin/ClinicManagement'

// Clinic Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import AdminInventory from './pages/admin/AdminInventory'
import AdminBilling from './pages/admin/AdminBilling'
import ClinicServicesSettings from './pages/admin/ClinicServicesSettings'

// Doctor
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import ConsultationView from './pages/doctor/ConsultationView'
import DoctorConsultations from './pages/doctor/DoctorConsultations'
import DoctorKnowledge from './pages/doctor/DoctorKnowledge'
import DoctorBookmarks from './pages/doctor/DoctorBookmarks'

// Nurse / Reception
import ReceptionDashboard from './pages/reception/ReceptionDashboard'
import NurseBilling from './pages/nurse/NurseBilling'
import NursePatients from './pages/nurse/NursePatients'

// Shared
import Settings from './pages/shared/Settings'
import AppointmentCalendar from './components/AppointmentCalendar'
import Reports from './pages/shared/Reports'

// ─── 角色重定向大腦 ────────────────────────────────────────────────────────────
function RoleRedirect() {
    const { userProfile, loading, session } = useAuth()
    if (loading) return <LoadingSpinner fullScreen />
    if (!session) return <Navigate to="/login" replace />
    switch (userProfile?.role) {
        case 'super_admin':   return <Navigate to="/superadmin" replace />
        case 'clinic_admin':  return <Navigate to="/admin" replace />
        case 'doctor':        return <Navigate to="/doctor" replace />
        case 'nurse':         return <Navigate to="/nurse" replace />
        default:              return <LoadingSpinner fullScreen />
    }
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* ── Super Admin ──────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route element={<AppShell />}>
                    <Route path="/superadmin" element={<SuperAdminDashboard />} />
                    <Route path="/superadmin/clinics" element={<ClinicManagement />} />
                </Route>
            </Route>

            {/* ── Clinic Admin ─────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['clinic_admin']} />}>
                <Route element={<AppShell />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/appointments" element={<AppointmentCalendar />} />
                    <Route path="/admin/inventory" element={<AdminInventory />} />
                    <Route path="/admin/billing" element={<AdminBilling />} />
                    <Route path="/admin/settings" element={<Settings />} />
                    <Route path="/admin/reports" element={<Reports />} />
                    <Route path="/admin/services" element={<ClinicServicesSettings />} />
                </Route>
            </Route>

            {/* ── Doctor ───────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
                <Route element={<ConsultationProvider><AppShell /></ConsultationProvider>}>
                    <Route path="/doctor" element={<DoctorDashboard />} />
                    <Route path="/doctor/appointments" element={<AppointmentCalendar />} />
                    <Route path="/doctor/consultation/:id" element={<ConsultationView />} />
                    <Route path="/doctor/consultations" element={<DoctorConsultations />} />
                    <Route path="/doctor/knowledge" element={<DoctorKnowledge />} />
                    <Route path="/doctor/bookmarks" element={<DoctorBookmarks />} />
                    <Route path="/doctor/settings" element={<Settings />} />
                    <Route path="/doctor/reports" element={<Reports />} />
                </Route>
            </Route>

            {/* ── Nurse ────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['nurse']} />}>
                <Route element={<AppShell />}>
                    <Route path="/nurse" element={<ReceptionDashboard />} />
                    <Route path="/nurse/patients" element={<NursePatients />} />
                    <Route path="/nurse/billing" element={<NurseBilling />} />
                    <Route path="/nurse/settings" element={<Settings />} />
                    <Route path="/nurse/reports" element={<Reports />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    )
}