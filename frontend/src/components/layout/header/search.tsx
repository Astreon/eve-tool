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

export default function Search() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

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
                    <Button size="icon" variant="ghost" tabIndex={-1} aria-hidden="true">
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
                <Button size="icon" variant="ghost" onClick={() => setOpen(true)}>
                    <SearchIcon />
                </Button>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <VisuallyHidden>
                    <DialogHeader>
                        <DialogTitle></DialogTitle>
                    </DialogHeader>
                </VisuallyHidden>
                <CommandInput placeholder="Type a command or search..." />
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
                </CommandList>
            </CommandDialog>
        </div>
    )
}
