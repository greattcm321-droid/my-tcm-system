import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import { supabase } from '../config/supabase'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile, ThemeKey } from '../types'
import { useTheme } from './ThemeContext'

interface AuthContextValue {
    session: Session | null
    userProfile: UserProfile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── User Row from DB (snake_case) ──────────────────────────────────────────
interface UserRow {
    id: string
    clinic_id: string
    email: string
    name: string // 🔥 這裡修正為 name
    role: UserProfile['role']
    avatar_url?: string
    specialization?: string
    bookmarks: string[]
    theme_key?: string
    created_at: string
}

function toUserProfile(row: UserRow): UserProfile {
    return {
        id: row.id,
        clinicId: row.clinic_id ?? '',
        email: row.email,
        displayName: row.name, // 🔥 這裡將資料庫的 name 映射給前端的 displayName
        role: row.role,
        avatarUrl: row.avatar_url,
        specialization: row.specialization,
        bookmarks: row.bookmarks ?? [],
        createdAt: row.created_at,
    }
}

async function fetchUserProfile(id: string): Promise<{ profile: UserProfile | null; themeKey?: string }> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        console.error('[AuthContext] Failed to fetch user profile:', error?.message)
        return { profile: null }
    }

    const row = data as UserRow
    return { profile: toUserProfile(row), themeKey: row.theme_key }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const { applyThemeFromDB } = useTheme()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (!session) setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession)
            if (!currentSession) {
                setUserProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        let active = true

        const loadProfile = async () => {
            if (!session?.user) return

            try {
                const { profile, themeKey } = await fetchUserProfile(session.user.id)
                if (active) {
                    setUserProfile(profile)
                    if (themeKey) applyThemeFromDB(themeKey as ThemeKey)
                }
            } catch (err) {
                console.error('[AuthContext] Error loading profile:', err)
            } finally {
                if (active) setLoading(false)
            }
        }

        loadProfile()

        return () => { active = false }
    }, [session, applyThemeFromDB])

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUserProfile(null)
    }

    return (
        <AuthContext.Provider value={{ session, userProfile, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}