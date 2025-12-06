/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FEATURES, type FeatureId } from '@/features/auth/features'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { seo } from '@/lib/seo.ts'
import { AUTH_BASE } from '@/lib/env.ts'

export const Route = createFileRoute('/onboarding')({
    head: () => ({
        meta: seo({
            title: 'Onboarding',
            description: 'Start your journey with EVE Toolkit.',
        }),
    }),
    component: OnboardingPage,
})

const BASE_FEATURE_ID: FeatureId = 'search'

function OnboardingPage() {
    const { isAuthenticated, isReady, session } = useAuth()
    const label = isAuthenticated ? 'Verify with EVE Online' : 'Login with EVE Online'

    const currentScopes = (session?.scopes ?? []).slice()

    const [selected, setSelected] = useState<Set<FeatureId>>(() => new Set())
    const [initializedFromSession, setInitializedFromSession] = useState(false)

    useEffect(() => {
        if (!isReady || initializedFromSession) return

        const next = new Set<FeatureId>()

        for (const feature of FEATURES) {
            if (feature.id === BASE_FEATURE_ID) continue
            if (
                feature.scopes.length > 0 &&
                feature.scopes.every((s) => currentScopes.includes(s))
            ) {
                next.add(feature.id)
            }
        }

        setSelected(next)
        setInitializedFromSession(true)
    }, [isReady, initializedFromSession, currentScopes.join(',')])

    const toggle = (id: FeatureId) => {
        if (id === BASE_FEATURE_ID) return

        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const { scopes, scopeString } = useMemo(() => {
        const scopeSet = new Set<string>()

        for (const feature of FEATURES) {
            const isBase = feature.id === BASE_FEATURE_ID
            const isSelected = isBase || selected.has(feature.id)

            if (isSelected) {
                for (const s of feature.scopes) {
                    scopeSet.add(s)
                }
            }
        }

        scopeSet.add('publicData')

        const arr = Array.from(scopeSet)
        return {
            scopes: arr,
            scopeString: arr.join(','),
        }
    }, [selected])

    const handleLogin = async () => {
        try {
            const redirect = '/'

            const resp = await fetch(
                `${AUTH_BASE}/login?scopes=${encodeURIComponent(scopeString)}&redirect=${encodeURIComponent(redirect)}`,
            )

            if (!resp.ok) {
                console.error('Failed to start login', await resp.text())
                return
            }

            const data = (await resp.json()) as {
                success: boolean
                url?: string
                message?: string
            }

            if (!data.success || !data.url) {
                console.error('Unexpected login response', data)
                return
            }

            window.location.href = data.url
        } catch (err) {
            console.error('Failed to start login', err)
        }
    }

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Onboarding</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Select the features you want to use. We will then calculate the required ESI
                    permissions (scopes).
                    <br />
                    You can repeat this onboarding at any time to expand or restrict your
                    permissions.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((feature) => {
                    const isBase = feature.id === BASE_FEATURE_ID
                    const isSelected = isBase || selected.has(feature.id)

                    return (
                        <button
                            key={feature.id}
                            type="button"
                            onClick={() => toggle(feature.id)}
                            className={cn(
                                'flex h-full flex-col items-stretch rounded-md border p-4 text-left transition',
                                isBase ? 'cursor-default' : 'cursor-pointer',
                                'hover:border-primary',
                                isSelected ? 'border-primary bg-primary/5' : 'border-muted',
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{feature.icon}</span>
                                        <h2 className="text-sm font-semibold">{feature.name}</h2>
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {feature.description}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {feature.badge && (
                                        <Badge
                                            variant={isBase ? 'default' : 'outline'}
                                            className={cn(
                                                'text-[10px]',
                                                isBase && 'bg-primary text-primary-foreground',
                                            )}
                                        >
                                            {feature.badge}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            {feature.scopes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {feature.scopes.map((scope) => (
                                        <span
                                            key={scope}
                                            className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[10px]"
                                        >
                                            {scope}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">Selected scopes:</span>
                {scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="font-mono text-[10px]">
                        {scope}
                    </Badge>
                ))}
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs">
                    After logging in, you will be redirected to EVE Online to confirm your selected
                    scopes.
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                        <Link to="/">Abbrechen</Link>
                    </Button>
                    <Button onClick={handleLogin}>{label}</Button>
                </div>
            </div>
        </div>
    )
}
