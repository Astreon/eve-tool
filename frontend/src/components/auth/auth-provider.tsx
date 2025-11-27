/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import {useHydrated} from '@tanstack/react-router'

export type AuthSession = {
    characterId: number
    characterName: string
    scopes: string[]
    accessToken: string
    refreshToken?: string
    expiresAt: number
}

type AuthContextValue = {
    session: AuthSession | null
    isAuthenticated: boolean
    isReady: boolean
    login: () => void
    logout: () => void
    setSession: (session: AuthSession | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'eve-tool.sso'

export function AuthProvider({children}: { children: ReactNode }) {
    const hydrated = useHydrated()
    const [session, setSession] = useState<AuthSession | null>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw) as AuthSession
                if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
                    setSession(parsed)
                } else {
                    window.localStorage.removeItem(STORAGE_KEY)
                }
            }
        } catch {
            /* noop */
        } finally {
            setIsReady(true)
        }
    }, [hydrated])


    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return
        if (!session) {
            window.localStorage.removeItem(STORAGE_KEY)
            return
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    }, [session, hydrated])

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            isAuthenticated: !!session,
            isReady,
            login: () => {
                if (typeof window === 'undefined') return
                void fetch('/auth/login')
                    .then(async (res) => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`)
                        const body = (await res.json()) as {
                            success: boolean
                            url?: string
                            message?: string
                        }
                        if (!body.success || !body.url) {
                            throw new Error(body.message ?? 'Login failed')
                        }
                        window.location.href = body.url
                    })
                    .catch((err) => {
                        console.error('Failed to start login', err)
                    })
            },
            logout: () => {
                setSession(null)
            },
            setSession,
        }),
        [session, isReady],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}
