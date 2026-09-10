import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Users, School, ShieldAlert, Sparkles, UserPlus, Mail, RefreshCw, KeyRound } from 'lucide-react'
import type { UserProfile, UserRole } from '../../types'

export default function SuperAdminDashboard() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [formLoading, setFormLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Form states
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [clinicId, setClinicId] = useState('')

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            const mappedUsers = (data || []).map((row: any) => ({
                id: row.id,
                clinicId: row.clinic_id,
                email: row.email,
                displayName: row.display_name,
                role: row.role as UserRole,
                bookmarks: row.bookmarks || [],
                createdAt: row.created_at,
            }))

            setUsers(mappedUsers)
        } catch (err: any) {
            console.error('載入帳號失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)
        setFormLoading(true)

        console.log('🟢 [1] 按鈕已點擊，開始建立帳號流程')

        try {
            const payload = {
                email: email.trim(),
                password: password,
                name: displayName.trim(),
                role: 'clinic_admin',
                clinic_id: clinicId.trim()
            }
            console.log('🟢 [2] 準備發送給 Edge Function 的資料:', payload)

            // 👇 這是我們加入的死鎖偵測儀 👇
            console.log('🟢 [2.1] 測試底層 Auth 狀態是否卡死 (準備取得 Session)...')
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            if (sessionError) console.error('🔴 取得 Session 報錯:', sessionError)
            console.log('🟢 [2.2] Auth 沒有卡死，成功取得 Session:', sessionData?.session?.user?.id)
            // 👆 偵測結束 👆

            // 如果 [2.1] 印出後就沒有下文，代表就是死在上面那行 getSession！
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: payload
            })

            console.log('🟢 [3] Edge Function 回傳結果:', { data, error })

            if (error) {
                console.error('🔴 Edge Function 呼叫失敗:', error)
                throw error
            }
            if (data?.error) {
                console.error('🔴 後端邏輯回傳錯誤:', data.error)
                throw new Error(data.error)
            }

            console.log('🟢 [4] 建立成功！')
            setMessage({ type: 'success', text: `成功建立診所管理員！帳號 ID: ${data.user_id}` })

            setEmail('')
            setPassword('')
            setDisplayName('')
            setClinicId('')

            await fetchUsers()

        } catch (err: any) {
            console.error('❌ [錯誤] 建立帳號過程發生例外狀況:', err)
            setMessage({ type: 'error', text: err.message || '建立帳號失敗，請檢查輸入或網路。' })
        } finally {
            console.log('🟢 [5] 結束流程，解鎖按鈕')
            setFormLoading(false)
        }
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in relative min-h-screen">
            <div className="relative overflow-hidden p-6 rounded-sm border border-theme-border bg-theme-surface shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Sparkles size={120} className="text-theme-primary" />
                </div>
                <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
                    🛡️ 全平台診所管理中心
                </h1>
                <p className="text-theme-text-muted text-sm mt-1">
                    杞子中醫 SaaS 超級管理後台 (Super Admin Dashboard)。在此集中分配各診所的管理權限、查看並控管全站帳號。
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-6 border border-theme-border bg-theme-surface rounded-sm shadow-sm space-y-6">
                    <div className="flex items-center gap-2 pb-3 border-b border-theme-border">
                        <UserPlus size={18} className="text-theme-primary" />
                        <h2 className="text-sm font-bold text-theme-text uppercase tracking-widest">建立診所管理員</h2>
                    </div>

                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text">電子郵件 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-theme-text-muted opacity-60" size={16} />
                                <input
                                    required
                                    type="email"
                                    placeholder="admin@clinic.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="input-field pl-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text">初始密碼 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 text-theme-text-muted opacity-60" size={16} />
                                <input
                                    required
                                    type="text"
                                    placeholder="請輸入初始密碼 (至少 6 碼)"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="input-field pl-10 text-sm"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text">管理員姓名 <span className="text-red-500">*</span></label>
                            <input
                                required
                                placeholder="王大夫 (Clinic Admin)"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                className="input-field text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-text">分配診所 ID (clinic_id) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <School className="absolute left-3 top-2.5 text-theme-text-muted opacity-60" size={16} />
                                <input
                                    required
                                    placeholder="例: central-clinic-01"
                                    value={clinicId}
                                    onChange={e => setClinicId(e.target.value)}
                                    className="input-field pl-10 text-sm font-mono"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 text-xs rounded-sm border ${message.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                                }`}>
                                <div className="flex gap-2">
                                    <ShieldAlert size={14} className="shrink-0" />
                                    <span>{message.text}</span>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={formLoading}
                            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
                        >
                            {formLoading ? '正在寫入資料庫…' : '確認建立並分配'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 card p-6 border border-theme-border bg-theme-surface rounded-sm shadow-sm flex flex-col min-h-[450px]">
                    <div className="flex items-center justify-between pb-3 border-b border-theme-border mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-theme-primary" />
                            <h2 className="text-sm font-bold text-theme-text uppercase tracking-widest">全系統帳號列表 ({users.length})</h2>
                        </div>
                        <button
                            onClick={fetchUsers}
                            disabled={loading}
                            className="p-1 rounded-sm border border-theme-border hover:bg-theme-bg text-theme-text-muted hover:text-theme-primary transition-all"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <RefreshCw className="animate-spin text-theme-primary mb-2" size={24} />
                            <span className="text-xs text-theme-text-muted">正在同步…</span>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center italic text-theme-text-muted text-sm py-12">
                            目前系統內無帳號。
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-theme-border bg-theme-bg/60">
                                        <th className="px-4 py-2.5 text-xs font-bold text-theme-text uppercase tracking-wider">姓名</th>
                                        <th className="px-4 py-2.5 text-xs font-bold text-theme-text uppercase tracking-wider">電子郵件</th>
                                        <th className="px-4 py-2.5 text-xs font-bold text-theme-text uppercase tracking-wider">角色類型</th>
                                        <th className="px-4 py-2.5 text-xs font-bold text-theme-text uppercase tracking-wider">診所編號</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b border-theme-border hover:bg-theme-bg/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-bold text-theme-text">{u.displayName}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-theme-text-muted">{u.email}</td>
                                            <td className="px-4 py-3 text-xs">{u.role}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-theme-text">{u.clinicId || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}