/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { AUTH_BASE } from '@/lib/env'

type CallbackResponse = {
    success: boolean
    message?: string
    tokens?: {
        access_token: string
        refresh_token?: string
        expires_in: number
    }
    character?: {
        id: number
        name: string
        scopes?: string[]
        onboardingCompleted?: boolean
    }
    redirectTo?: string | null
}

export const Route = createFileRoute('/sso/callback')({
    component: CallbackPage,
})

function CallbackPage() {
    const { setSession } = useAuth()
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const run = async () => {
            try {
                const url = new URL(window.location.href)
                const code = url.searchParams.get('code')
                const state = url.searchParams.get('state')

                if (!code || !state) {
                    setError('Missing code or state in callback URL')
                    return
                }

                const res = await fetch(
                    `${AUTH_BASE}/callback?code=${encodeURIComponent(
                        code,
                    )}&state=${encodeURIComponent(state)}`,
                )

                const body = (await res.json()) as CallbackResponse

                if (
                    !res.ok ||
                    !body.success ||
                    !body.tokens ||
                    !body.character
                ) {
                    throw new Error(
                        body.message ?? `Callback failed (HTTP ${res.status})`,
                    )
                }

                const expiresAt = Date.now() + body.tokens.expires_in * 1000
                const scopes = body.character.scopes ?? []

                const onboardingCompleted =
                    body.character.onboardingCompleted ?? false
                const redirectTo = body.redirectTo ?? null

                setSession({
                    accessToken: body.tokens.access_token,
                    refreshToken: body.tokens.refresh_token ?? undefined,
                    characterId: body.character?.id ?? 0,
                    characterName: body.character?.name ?? 'Unknown',
                    scopes,
                    expiresAt,
                    onboardingCompleted,
                })

                url.searchParams.delete('code')
                url.searchParams.delete('state')
                window.history.replaceState({}, '', url.toString())

                if (!onboardingCompleted) {
                    router.navigate({ to: '/onboarding' })
                } else if (redirectTo) {
                    router.navigate({ to: redirectTo as any })
                } else {
                    router.navigate({ to: '/' })
                }
            } catch (e: any) {
                console.error(e)
                setError(e?.message ?? 'Unknown error')
            }
        }

        void run()
    }, [setSession, router])

    if (error) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="space-y-2 text-center">
                    <h1 className="text-xl font-semibold">Login failed</h1>
                    <p className="text-muted-foreground text-sm">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <div className="space-y-2 text-center">
                <h1 className="text-xl font-semibold">
                    You will be logged in...
                </h1>
                <p className="text-muted-foreground text-sm">
                    Please wait a moment, the connection to EVE SSO is being
                    completed.
                </p>
            </div>
        </div>
    )
}
