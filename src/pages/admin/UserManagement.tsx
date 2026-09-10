import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { UserProfile, UserRole } from '../../types'
import { UserPlus, Pencil, Trash2, X, Loader2, ShieldCheck, Stethoscope, HeartPulse } from 'lucide-react'

interface FormState {
    displayName: string
    email: string
    password: string
    role: 'doctor' | 'nurse' | 'clinic_admin'
}

const emptyForm: FormState = {
    displayName: '',
    email: '',
    password: '',
    role: 'doctor',
}

const roleMeta: Record<UserRole, { label: string; icon: React.ElementType; badge: string }> = {
    super_admin: { label: '超級管理員', icon: ShieldCheck, badge: 'bg-red-50 text-red-700 border-red-200' },
    clinic_admin: { label: '診所管理員', icon: ShieldCheck, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    doctor: { label: '醫師', icon: Stethoscope, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    nurse: { label: '護士', icon: HeartPulse, badge: 'bg-blue-50 text-blue-700 border-blue-200' },
}

export default function UserManagement() {
    const { userProfile } = useAuth()
    const clinicId = userProfile?.clinicId || ''

    const [users, setUsers] = useState<UserProfile[]>([])
    const [loadingUsers, setLoadingUsers] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState<UserProfile | null>(null)
    const [form, setForm] = useState<FormState>(emptyForm)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchUsers = async () => {
        if (!clinicId) return
        setLoadingUsers(true)
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('created_at', { ascending: false })

            if (error) throw error

            const mapped = (data || []).map((row: any) => ({
                id: row.id,
                clinicId: row.clinic_id,
                email: row.email,
                displayName: row.name, // 確保對齊 DB 欄位 name
                role: row.role as UserRole,
                bookmarks: row.bookmarks ?? [],
                createdAt: row.created_at,
            }))

            setUsers(mapped)
        } catch (err: any) {
            console.error('[UserManagement] Fetch failed:', err)
        } finally {
            setLoadingUsers(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [clinicId])

    const openCreate = () => {
        setEditTarget(null)
        setForm(emptyForm)
        setError('')
        setShowModal(true)
    }

    const openEdit = (u: UserProfile) => {
        setEditTarget(u)
        setForm({
            displayName: u.displayName,
            email: u.email,
            password: '',
            role: u.role as 'doctor' | 'nurse' | 'clinic_admin',
        })
        setError('')
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            if (editTarget) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        name: form.displayName.trim(), // 確保更新時使用對的欄位名稱
                        role: form.role,
                    })
                    .eq('id', editTarget.id)

                if (error) throw error
            } else {
                // 呼叫 Edge Function
                const { data, error } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: form.email.trim(),
                        password: form.password, // 傳送表單輸入的密碼
                        name: form.displayName.trim(),
                        role: form.role,
                        clinic_id: clinicId,
                    }
                })

                if (error) throw error
                if (data?.error) throw new Error(data.error)
            }
            await fetchUsers()
            setForm(emptyForm)
            setShowModal(false)
        } catch (err: any) {
            console.error('[UserManagement] Save failed:', err)
            setError(err.message || '儲存帳號失敗，請重試。')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (u: UserProfile) => {
        if (!confirm(`確定要刪除「${u.displayName}」嗎？此操作無法復原。`)) return
        setDeletingId(u.id)
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', u.id)

            if (error) throw error
            setUsers((prev) => prev.filter((x) => x.id !== u.id))
        } catch (err: any) {
            console.error('[UserManagement] Delete failed:', err)
            alert(err.message || '刪除失敗')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-theme-primary">員工管理</h2>
                    <p className="text-theme-text-muted text-sm mt-0.5">管理目前診所（診所編號: {clinicId}）的醫師、護士及管理員帳號</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2">
                    <UserPlus size={16} />
                    新增員工
                </button>
            </div>

            {/* Table */}
            <div className="bg-theme-surface border border-theme-border rounded-sm overflow-hidden shadow-sm">
                {loadingUsers ? (
                    <div className="flex items-center justify-center py-16 text-theme-text-muted">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        載入中…
                    </div>
                ) : users.length === 0 ? (
                    <p className="text-center py-16 text-theme-text-muted">尚無員工資料</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-border text-theme-text-muted text-xs uppercase tracking-wide bg-theme-bg/50">
                                <th className="px-5 py-3.5 text-left font-bold">姓名</th>
                                <th className="px-5 py-3.5 text-left font-bold">電郵</th>
                                <th className="px-5 py-3.5 text-left font-bold">職位</th>
                                <th className="px-5 py-3.5 text-right font-bold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border/50">
                            {users.map((u) => {
                                const { label, icon: Icon, badge } = roleMeta[u.role] || { label: u.role, icon: ShieldCheck, badge: '' }
                                return (
                                    <tr key={u.id} className="hover:bg-theme-bg/40 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: 'var(--primary)' }}>
                                                    {u.displayName?.[0] ?? '?'}
                                                </div>
                                                <span className="text-theme-text font-bold">{u.displayName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-theme-text-muted">{u.email}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${badge}`}>
                                                <Icon size={11} />
                                                {label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    disabled={deletingId === u.id}
                                                    className="p-1.5 rounded-lg text-theme-text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                                >
                                                    {deletingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-theme-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-theme-surface border border-theme-border rounded-sm shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-theme-border">
                            <h3 className="text-theme-text font-bold text-lg">
                                {editTarget ? '編輯員工資料' : '新增員工帳號'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-theme-text text-sm font-bold mb-1.5">姓名</label>
                                <input
                                    className="input-field"
                                    value={form.displayName}
                                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                                    required
                                    placeholder="陳大文"
                                />
                            </div>

                            <div>
                                <label className="block text-theme-text text-sm font-bold mb-1.5">電郵地址</label>
                                <input
                                    type="email"
                                    className="input-field disabled:opacity-50"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    required={!editTarget}
                                    disabled={!!editTarget}
                                    placeholder="doctor@clinic.com"
                                />
                                {editTarget && <p className="text-theme-text-muted text-xs mt-1">電郵建立後無法更改</p>}
                            </div>

                            {!editTarget && (
                                <div>
                                    <label className="block text-theme-text text-sm font-bold mb-1.5">初始密碼</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        value={form.password}
                                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                        required
                                        minLength={6}
                                        placeholder="至少 6 個字元"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-theme-text text-sm font-bold mb-1.5">職位</label>
                                <select
                                    className="input-field"
                                    value={form.role}
                                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}
                                >
                                    <option value="doctor">醫師</option>
                                    <option value="nurse">護士</option>
                                    <option value="clinic_admin">診所管理員</option>
                                </select>
                            </div>

                            {error && (
                                <div className="bg-red-50/50 border border-red-200/50 text-red-600 text-sm px-4 py-3 rounded-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-sm border border-theme-border text-theme-text-muted hover:bg-theme-bg transition-colors text-sm font-bold"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {editTarget ? '儲存變更' : '建立帳號'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}