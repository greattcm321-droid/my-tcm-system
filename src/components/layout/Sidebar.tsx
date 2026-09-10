import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, Calendar, ClipboardList, BookOpen, Bookmark,
    Users, Package, BarChart3, Receipt, LogOut, ShieldCheck, Settings, Building2, Sliders
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types'

interface NavItem { to: string; icon: React.ElementType; label: string }

const navItems: Partial<Record<UserRole, NavItem[]>> = {
    super_admin: [
        { to: '/superadmin', icon: ShieldCheck, label: '平台總覽' },
        { to: '/superadmin/clinics', icon: Building2, label: '診所管理' },
    ],
    clinic_admin: [
        { to: '/admin', icon: LayoutDashboard, label: '控制台' },
        { to: '/admin/users', icon: Users, label: '員工管理' },
        { to: '/admin/appointments', icon: Calendar, label: '預約管理' },
        { to: '/admin/inventory', icon: Package, label: '庫存管理' },
        { to: '/admin/services', icon: Sliders, label: '服務項目' },
        { to: '/admin/billing', icon: Receipt, label: '帳單管理' },
        { to: '/admin/reports', icon: BarChart3, label: '營業報表' },
    ],
    doctor: [
        { to: '/doctor', icon: LayoutDashboard, label: '控制台' },
        { to: '/doctor/appointments', icon: Calendar, label: '今日預約' },
        { to: '/doctor/consultations', icon: ClipboardList, label: '問診記錄' },
        { to: '/doctor/knowledge', icon: BookOpen, label: '知識庫' },
        { to: '/doctor/bookmarks', icon: Bookmark, label: '書籤' },
        { to: '/doctor/reports', icon: BarChart3, label: '營業報表' },
    ],
    nurse: [
        { to: '/nurse', icon: LayoutDashboard, label: '掛號大廳' },
        { to: '/nurse/billing', icon: Receipt, label: '批價結帳' },
        { to: '/nurse/patients', icon: Users, label: '病患庫' },
        { to: '/nurse/reports', icon: BarChart3, label: '營業報表' },
    ],
}

const settingsPath: Partial<Record<UserRole, string>> = {
    super_admin: '/superadmin',
    clinic_admin: '/admin/settings',
    doctor: '/doctor/settings',
    nurse: '/nurse/settings',
}

const roleLabel: Partial<Record<UserRole, string>> = {
    super_admin: '超級管理員',
    clinic_admin: '管理員',
    doctor: '醫師',
    nurse: '護士',
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const { userProfile, signOut } = useAuth()

    if (!userProfile) return null

    const role = userProfile.role
    const items = navItems[role] || []
    const settingsTo = settingsPath[role] || '/'
    const label = roleLabel[role] ?? role

    return (
        <div
            className="w-full h-14 border-b flex items-center justify-between px-6 shrink-0 bg-theme-surface z-50 no-print"
            style={{ borderColor: 'var(--border)' }}
        >
            {/* Logo */}
            <div className="flex items-center gap-2">
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-md shrink-0 text-white"
                    style={{ background: 'linear-gradient(135deg, var(--primary-light, var(--primary)), var(--primary))' }}
                >
                    🌿
                </div>
                <div className="overflow-hidden whitespace-nowrap leading-none">
                    <p className="font-bold text-xs" style={{ color: 'var(--text)' }}>杞子中醫</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>診所管理系統</p>
                </div>
            </div>

            {/* Horizontal Navigation Menu */}
            <nav className="flex items-center gap-1.5 flex-1 justify-center px-4 overflow-x-auto custom-scrollbar no-print">
                {items.map(({ to, icon: Icon, label: itemLabel }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/admin' || to === '/doctor' || to === '/nurse' || to === '/superadmin'}
                        onClick={onClose}
                        title={itemLabel}
                        className={({ isActive }) =>
                            `flex items-center rounded-lg px-3 py-1.5 transition-all border gap-0 hover:gap-1.5 group text-xs font-bold whitespace-nowrap
                            ${isActive 
                                ? 'bg-theme-primary/10 text-theme-primary border-theme-primary/20 gap-1.5' 
                                : 'border-transparent text-theme-text-muted hover:bg-theme-surface-alt hover:text-theme-text'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon size={15} className="shrink-0" />
                                <span
                                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
                                        ${isActive 
                                            ? 'max-w-[100px] opacity-100' 
                                            : 'max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100'}`}
                                >
                                    {itemLabel}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Right Controls (Settings, User Profile, Sign Out) */}
            <div className="flex items-center gap-3">
                {/* Settings icon */}
                {role !== 'super_admin' && (
                    <NavLink
                        to={settingsTo}
                        onClick={onClose}
                        title="系統設定"
                        className={({ isActive }) =>
                            `p-1.5 rounded-lg border transition-all text-theme-text-muted hover:text-theme-primary
                            ${isActive ? 'bg-theme-primary/10 border-theme-primary/20 text-theme-primary' : 'border-transparent'}`
                        }
                    >
                        <Settings size={15} />
                    </NavLink>
                )}

                {/* User badge */}
                <div
                    className="flex items-center gap-1.5 bg-theme-surface-alt/60 p-1 pr-2 rounded-full border border-theme-border group relative cursor-pointer"
                >
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                        style={{ background: 'var(--primary)' }}
                    >
                        {userProfile.displayName?.[0] ?? '?'}
                    </div>
                    <div className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-[100px] group-hover:opacity-100 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text leading-none">{userProfile.displayName}</p>
                        <span className="text-[8px] text-theme-text-muted font-bold mt-0.5">{label}</span>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={signOut}
                    title="登出系統"
                    className="p-1.5 rounded-lg text-theme-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={15} />
                </button>
            </div>
        </div>
    )
}