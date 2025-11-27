/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {useState, useMemo, useEffect} from 'react'
import {useAuth} from '@/components/auth/auth-provider'
import {createFileRoute, Link} from '@tanstack/react-router'
import {FEATURES, type FeatureId} from '@/features/auth/features'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {cn} from '@/lib/utils'

export const Route = createFileRoute('/onboarding')({
    component: OnboardingPage,
})

const BASE_FEATURE_ID: FeatureId = 'search'

function OnboardingPage() {
    const { isAuthenticated, isReady, session } = useAuth()
    const label = isAuthenticated ? 'Verify with EVE Online' : 'Login with EVE Online'

    const currentScopes = (session?.scopes ?? []).slice()

    const [selected, setSelected] = useState<Set<FeatureId>>(
        () => new Set(),
    )
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

    const {scopes, scopeString} = useMemo(() => {
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
            const resp = await fetch(
                `/auth/login?scopes=${encodeURIComponent(scopeString)}`,
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
                    Select the features you want to use. We will then calculate the required ESI permissions
                    (scopes).<br/>
                    You can expand or restrict this at any time via your account settings.
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
                                isSelected && 'border-primary bg-primary/10',
                            )}
                        >
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-2xl">{feature.icon}</span>
                                {feature.badge && (
                                    <Badge
                                        variant={
                                            isBase
                                                ? 'default'
                                                : isSelected
                                                    ? 'default'
                                                    : 'outline'
                                        }
                                    >
                                        {feature.badge}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="font-semibold">{feature.name}</div>
                                <p className="text-xs text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1">
                                {feature.scopes.map((scope) => (
                                    <span
                                        key={scope}
                                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                                    >
                    {scope}
                  </span>
                                ))}
                            </div>
                        </button>
                    )
                })}
            </div>


            <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="font-medium">These ESI scopes are set for your account:</div>
                <div className="flex flex-wrap gap-1">
                    {scopes.map((scope) => (
                        <span
                            key={scope}
                            className="rounded-full bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                        >
              {scope}
            </span>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    After logging in, you will be redirected to EVE Online to confirm your selected scopes.
                </p>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" asChild>
                        <Link to="/">Abbrechen</Link>
                    </Button>
                    <Button onClick={handleLogin}>
                        {label}
                    </Button>
                </div>
            </div>
        </div>
    )
}