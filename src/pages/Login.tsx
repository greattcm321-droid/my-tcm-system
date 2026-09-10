import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { signIn } = useAuth()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await signIn(email, password)
            navigate('/', { replace: true })
        } catch (err: any) {
            setError(err.message || '登入失敗，請檢查電郵地址及密碼是否正確。')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
            {/* ── Left decorative panel ── */}
            <div
                className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #000) 100%)' }}
            >
                {/* Ambient glows */}
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-30"
                    style={{ background: 'var(--surface)' }} />
                <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-20"
                    style={{ background: 'var(--bg)' }} />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                    }}
                />

                <div className="relative z-10 text-center px-12">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-sm flex items-center justify-center text-4xl shadow-2xl"
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                        🌿
                    </div>

                    <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">杞子中醫</h1>
                    <p className="text-white/70 text-lg mb-6">診所管理系統</p>

                    <div className="w-12 h-px mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.35)' }} />

                    <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                        整合預約・問診・藥方・帳單<br />的全方位中醫診所管理平台
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap justify-center gap-2 mt-8">
                        {['即時預約同步', '智能問診記錄', '古典醫籍知識庫', '庫存帳單管理'].map((f) => (
                            <span
                                key={f}
                                className="text-xs px-3 py-1 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right login panel ── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6"
                style={{ background: 'var(--bg)' }}>
                <div className="w-full max-w-md">
                    {/* Mobile-only logo */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-sm flex items-center justify-center text-2xl"
                            style={{ background: 'var(--primary)' }}>
                            🌿
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>杞子中醫診所管理系統</h1>
                    </div>

                    <div className="card p-8 shadow-xl">
                        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text)' }}>歡迎回來</h2>
                        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>請使用診所帳號登入</p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                                    電郵地址
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="input-field"
                                    placeholder="your@clinic.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                                    密碼
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="input-field"
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <div className="text-sm px-4 py-3 rounded-sm"
                                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)', color: 'var(--primary)' }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        登入中…
                                    </>
                                ) : (
                                    '登入系統'
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        © 2026 杞子中醫診所 · 醫師管理系統 v0.1.0
                    </p>
                </div>
            </div>
        </div>
    )
}
