/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import React, { useEffect, useState } from 'react'
import { CommandIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { navItems } from '@/components/layout/sidebar/nav-main'
import { useRouter } from '@tanstack/react-router'
import { API_BASE } from '@/lib/env'

type UniverseSearchItem = {
    id: number
    name?: string
}

type UniverseSearchResult = {
    regions: UniverseSearchItem[]
    solar_systems: UniverseSearchItem[]
}

export default function Search() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    const [query, setQuery] = useState('')
    const [universeResults, setUniverseResults] =
        useState<UniverseSearchResult | null>(null)
    const [isUniverseLoading, setIsUniverseLoading] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!open) {
            setUniverseResults(null)
            setIsUniverseLoading(false)
            return
        }

        const trimmed = query.trim()
        if (trimmed.length < 2) {
            setUniverseResults(null)
            return
        }

        const controller = new AbortController()

        async function run() {
            try {
                setIsUniverseLoading(true)

                const params = new URLSearchParams({
                    query: trimmed,
                })

                const res = await fetch(
                    `${API_BASE}/universe/search?${params.toString()}`,
                    {
                        signal: controller.signal,
                    },
                )

                if (res.status === 401) {
                    setUniverseResults(null)
                    setIsUniverseLoading(false)
                    return
                }

                if (!res.ok) {
                    throw new Error(`Search failed with status ${res.status}`)
                }

                const body = await res.json()

                if (!body?.success) {
                    setUniverseResults(null)
                    return
                }

                const data = body.data ?? {}

                const regions =
                    ((data.regions ?? []) as UniverseSearchItem[]) ?? []
                const solarSystems =
                    ((data.solar_systems ?? []) as UniverseSearchItem[]) ?? []

                setUniverseResults({
                    regions,
                    solar_systems: solarSystems,
                })
            } catch {
                if (controller.signal.aborted) return
                setUniverseResults(null)
            } finally {
                if (!controller.signal.aborted) {
                    setIsUniverseLoading(false)
                }
            }
        }

        run()

        return () => {
            controller.abort()
        }
    }, [query, open])

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    if (!mounted) {
        return (
            <div className="lg:flex-1">
                <div className="relative hidden max-w-sm flex-1 lg:block">
                    <div className="bg-muted/40 h-9 w-full rounded-md border" />
                </div>
                <div className="block lg:hidden">
                    <Button
                        size="icon"
                        variant="ghost"
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        <SearchIcon />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="lg:flex-1">
            <div className="relative hidden max-w-sm flex-1 lg:block">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                    className="h-9 w-full cursor-pointer rounded-md border pr-4 pl-10 text-sm shadow-xs"
                    placeholder="Search..."
                    type="search"
                    onFocus={() => setOpen(true)}
                />
                <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
                    <CommandIcon className="size-3" />
                    <span>k</span>
                </div>
            </div>
            <div className="block lg:hidden">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpen(true)}
                >
                    <SearchIcon />
                </Button>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <VisuallyHidden>
                    <DialogHeader>
                        <DialogTitle></DialogTitle>
                    </DialogHeader>
                </VisuallyHidden>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {navItems.map((route) => (
                        <React.Fragment key={route.title}>
                            <CommandGroup heading={route.title}>
                                {route.items?.map((item) => (
                                    <CommandItem
                                        key={item.title}
                                        onSelect={() => {
                                            setOpen(false)
                                            router.navigate({ to: item.href })
                                        }}
                                        value={item.title.toLowerCase()}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                        </React.Fragment>
                    ))}

                    {isUniverseLoading && (
                        <CommandGroup heading="Universe">
                            <CommandItem disabled value="universe-loading">
                                Searching backend...
                            </CommandItem>
                        </CommandGroup>
                    )}

                    {universeResults &&
                        !isUniverseLoading &&
                        (universeResults.regions.length > 0 ||
                            universeResults.solar_systems.length > 0) && (
                            <>
                                {universeResults?.regions.length > 0 && (
                                    <CommandGroup heading="Regions">
                                        {universeResults.regions.map(
                                            (region) => (
                                                <CommandItem
                                                    key={`region-${region.id}`}
                                                    onSelect={() => {
                                                        setOpen(false)
                                                        if (region.name) {
                                                            const slug =
                                                                encodeURIComponent(
                                                                    region.name,
                                                                )
                                                            router.navigate({
                                                                to: '/universe/region/$regionName',
                                                                params: {
                                                                    regionName:
                                                                        slug,
                                                                },
                                                            })
                                                        }
                                                    }}
                                                    value={(
                                                        region.name ??
                                                        `region-${region.id}`
                                                    ).toLowerCase()}
                                                >
                                                    <span>
                                                        {region.name ??
                                                            `Region #${region.id}`}
                                                    </span>
                                                </CommandItem>
                                            ),
                                        )}
                                    </CommandGroup>
                                )}

                                {universeResults?.solar_systems.length > 0 && (
                                    <CommandGroup heading="Systems">
                                        {universeResults.solar_systems.map(
                                            (system) => (
                                                <CommandItem
                                                    key={`system-${system.id}`}
                                                    onSelect={() => {
                                                        setOpen(false)
                                                        if (system.name) {
                                                            const slug =
                                                                encodeURIComponent(
                                                                    system.name,
                                                                )
                                                            router.navigate({
                                                                to: `/universe/system/${slug}`,
                                                            })
                                                        }
                                                    }}
                                                    value={(
                                                        system.name ??
                                                        `system-${system.id}`
                                                    ).toLowerCase()}
                                                >
                                                    <span>
                                                        {system.name ??
                                                            `System #${system.id}`}
                                                    </span>
                                                </CommandItem>
                                            ),
                                        )}
                                    </CommandGroup>
                                )}

                                <CommandSeparator />
                            </>
                        )}
                </CommandList>
            </CommandDialog>
        </div>
    )
}
