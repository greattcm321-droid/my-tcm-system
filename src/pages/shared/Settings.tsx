import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import type { ThemeKey } from '../../types'

/**
 * Settings — 全角色共用設定頁
 * 每個用戶切換主題時只更新自己的 Firestore doc（clinicId 隔離保障）
 */
export default function Settings() {
    const { themeKey, allThemes, setTheme } = useTheme()
    const { userProfile } = useAuth()

    return (
        <div className="p-8 min-h-screen" style={{ background: 'var(--bg)' }}>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
                系統設定
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                個人化您的工作介面，設定僅影響您自己的帳號。
            </p>

            {/* 主題切換 */}
            <section className="card p-4 max-w-xl mb-4 rounded-sm">
                <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>介面主題</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    切換後自動同步至本機與您的帳號，跨裝置登入自動套用。
                </p>
                <div className="flex flex-wrap gap-3">
                    {allThemes.map((t) => {
                        const isActive = themeKey === t.key
                        return (
                            <button
                                key={t.key}
                                id={`theme-btn-${t.key}`}
                                onClick={() => setTheme(t.key as ThemeKey, userProfile?.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium border transition-all"
                                style={isActive ? {
                                    borderColor: t.primary,
                                    color: t.primary,
                                    background: `${t.primary}18`,
                                    boxShadow: `0 0 0 1px ${t.primary}40`,
                                } : {
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-muted)',
                                    background: 'var(--surface-alt)',
                                }}
                            >
                                <span
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0"
                                    style={{ background: t.primary }}
                                />
                                {t.label}
                                {isActive && <span className="text-xs opacity-60">✓</span>}
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* 其他設定 placeholder */}
            <section className="card p-4 max-w-xl rounded-sm">
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>帳號資訊</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>顯示名稱</span>
                        <span style={{ color: 'var(--text)' }} className="font-medium">{userProfile?.displayName ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>電郵</span>
                        <span style={{ color: 'var(--text)' }} className="font-medium">{userProfile?.email ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>角色</span>
                        <span style={{ color: 'var(--primary)' }} className="font-medium">{userProfile?.role ?? '—'}</span>
                    </div>
                </div>
            </section>
        </div>
    )
}
