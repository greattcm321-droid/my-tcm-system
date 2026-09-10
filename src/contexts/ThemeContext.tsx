import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ThemeKey, ThemeConfig } from '../types'

const THEMES: Record<ThemeKey, ThemeConfig> = {
    crimson: {
        key: 'crimson',
        label: '深緋 (預設)',
        primary: '#763336',
        bg: '#FAF7F2',
        surface: '#FFFFFF',
        border: '#E2D8CC',
        text: '#2C1810',
    },
    ocean: {
        key: 'ocean',
        label: '鐵紺',
        primary: '#2B4B65',
        bg: '#F0F8FF',
        surface: '#FFFFFF',
        border: '#B3D9EE',
        text: '#023E58',
    },
    forest: {
        key: 'forest',
        label: '千歲綠',
        primary: '#4A5E4F',
        bg: '#F5FAF7',
        surface: '#FFFFFF',
        border: '#C8E6D4',
        text: '#1B3A2C',
    },
    midnight: {
        key: 'midnight',
        label: '墨色',
        primary: '#333631',
        bg: '#1A1A1A',
        surface: '#242424',
        border: '#3D3D3D',
        text: '#D1D1D1',
    },
    amber: {
        key: 'amber',
        label: '丁子色',
        primary: '#826645',
        bg: '#FFFBF0',
        surface: '#FFFFFF',
        border: '#FDE68A',
        text: '#451A03',
    },
}

interface ThemeContextValue {
    theme: ThemeConfig
    themeKey: ThemeKey
    allThemes: ThemeConfig[]
    /**
     * 設定主題並更新 localStorage。
     * @param uid 若傳入，同步寫入 Firestore users/{uid}.themeKey（跨裝置同步）。
     */
    setTheme: (key: ThemeKey, uid?: string) => void
    /** 由 AuthContext 登入後呼叫，「靜默」覆寫主題但不寫回 Firestore */
    applyThemeFromDB: (key: ThemeKey) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'tcm-theme'

function applyThemeVars(key: ThemeKey) {
    const t = THEMES[key]
    document.documentElement.setAttribute('data-theme', key)
    const root = document.documentElement.style
    root.setProperty('--primary', t.primary)
    root.setProperty('--bg', t.bg)
    root.setProperty('--surface', t.surface)
    root.setProperty('--border', t.border)
    root.setProperty('--text', t.text)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
        // Layer 1: 讀 localStorage（保留最後登出者的主題、全新電腦回退 crimson）
        const saved = localStorage.getItem(STORAGE_KEY)
        return (saved as ThemeKey) ?? 'crimson'
    })

    const theme = THEMES[themeKey]

    // 首次掛載時立刻套用
    useEffect(() => {
        applyThemeVars(themeKey)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 公開 setTheme：使用者在 /settings 主動切換時呼叫。
     * 同時更新 localStorage + CSS + (可選) Firestore。
     */
    const setTheme = useCallback((key: ThemeKey, uid?: string) => {
        setThemeKey(key)
        localStorage.setItem(STORAGE_KEY, key)
        applyThemeVars(key)

        // 若傳入 uid，非同步寫 Firestore（失敗不影響 UI）
        if (uid) {
            updateDoc(doc(db, 'users', uid), { themeKey: key }).catch((err) =>
                console.warn('[ThemeContext] Firestore themeKey 同步失敗:', err),
            )
        }
    }, [])

    /**
     * applyThemeFromDB：AuthContext 登入後靜默覆寫主題。
     * Layer 2：以 DB 值為最高優先，但登出時不清除 localStorage。
     */
    const applyThemeFromDB = useCallback((key: ThemeKey) => {
        setThemeKey(key)
        localStorage.setItem(STORAGE_KEY, key)
        applyThemeVars(key)
    }, [])

    return (
        <ThemeContext.Provider
            value={{ theme, themeKey, allThemes: Object.values(THEMES), setTheme, applyThemeFromDB }}
        >
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}
