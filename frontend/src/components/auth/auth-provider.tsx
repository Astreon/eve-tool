/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { useHydrated } from '@tanstack/react-router'
import { AUTH_BASE } from '@/lib/env'

export type AuthSession = {
    characterId: number
    characterName: string
    scopes: string[]
    accessToken: string
    refreshToken?: string
    expiresAt: number
    onboardingCompleted: boolean
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
const REFRESH_SKEW_MS = 60_000 // 1 minute

type AuthProviderProps = {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [session, setSession] = useState<AuthSession | null>(null)
    const [isReady, setIsReady] = useState(false)
    const hydrated = useHydrated()

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw) as AuthSession

                if (parsed.refreshToken) {
                    setSession(parsed)
                } else if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
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
        if (session) return

        const url = new URL(window.location.href)

        if (url.pathname !== '/auth/callback') {
            return
        }

        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')

        if (!code || !state) {
            return
        }

        const run = async () => {
            try {
                const resp = await fetch(
                    `${AUTH_BASE}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
                )

                if (!resp.ok) {
                    console.error(
                        'Login callback failed',
                        resp.status,
                        await resp.text(),
                    )
                    return
                }

                const data = (await resp.json()) as {
                    success: boolean
                    tokens: {
                        access_token: string
                        refresh_token?: string
                        expires_in: number
                    }
                    character: {
                        id: number
                        name: string
                        scopes: string[]
                        onboardingCompleted?: boolean
                    }
                }

                if (!data.success) {
                    console.error('Login callback returned error', data)
                    return
                }

                setSession({
                    characterId: data.character.id,
                    characterName: data.character.name,
                    scopes: data.character.scopes,
                    accessToken: data.tokens.access_token,
                    refreshToken: data.tokens.refresh_token,
                    expiresAt:
                        Date.now() + (data.tokens.expires_in ?? 1200) * 1000,
                    onboardingCompleted:
                        data.character.onboardingCompleted ?? false,
                })
            } catch (err) {
                console.error('Failed to complete login callback', err)
            } finally {
                url.searchParams.delete('code')
                url.searchParams.delete('state')
                window.history.replaceState({}, '', '/')
            }
        }

        void run()
    }, [hydrated, session])

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return
        if (!session) {
            window.localStorage.removeItem(STORAGE_KEY)
            return
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    }, [session, hydrated])

    const refresh = useCallback(async () => {
        if (!session?.refreshToken) return
        try {
            const res = await fetch(`${AUTH_BASE}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: session.refreshToken }),
            })

            if (!res.ok) {
                let body: unknown

                try {
                    body = await res.json()
                } catch {
                    try {
                        body = await res.text()
                    } catch {
                        body = '<unreadable>'
                    }
                }

                console.error('Refresh failed', res.status, body ?? '<no body>')
            }

            const data = (await res.json()) as {
                success: boolean
                tokens: {
                    access_token: string
                    refresh_token?: string
                    expires_in: number
                }
                character: {
                    id: number
                    name: string
                    scopes?: string[]
                    onboardingCompleted?: boolean
                }
            }

            if (!data.success) {
                console.error('Refresh failed', data)
                setSession(null)
                return
            }

            setSession((prev) => ({
                characterId: data.character.id,
                characterName: data.character.name,
                scopes: data.character.scopes ?? prev?.scopes ?? [],
                accessToken: data.tokens.access_token,
                refreshToken: data.tokens.refresh_token ?? prev?.refreshToken,
                expiresAt: Date.now() + data.tokens.expires_in * 1000,
                onboardingCompleted:
                    data.character.onboardingCompleted ??
                    prev?.onboardingCompleted ??
                    false,
            }))
        } catch (e) {
            console.error('Refresh error', e)
            setSession(null)
        }
    }, [session?.refreshToken])

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return
        if (!session?.refreshToken || !session.expiresAt) return

        const now = Date.now()
        const msUntilExpiry = session.expiresAt - now
        const timeoutMs = Math.max(msUntilExpiry - REFRESH_SKEW_MS, 0)

        if (msUntilExpiry <= 0) {
            void refresh()
            return
        }

        const id = window.setTimeout(() => {
            void refresh()
        }, timeoutMs)

        return () => window.clearTimeout(id)
    }, [hydrated, session?.expiresAt, session?.refreshToken, refresh])

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            isAuthenticated: !!session,
            isReady,
            login: () => {
                if (typeof window === 'undefined') return

                const url = new URL(window.location.href)
                const redirect = url.pathname + url.search + url.hash

                const loginUrl = `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirect)}`

                void fetch(loginUrl)
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
