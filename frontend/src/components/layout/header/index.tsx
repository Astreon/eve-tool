/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { PanelLeftIcon } from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import Notifications from '@/components/layout/header/notifications'
import Search from '@/components/layout/header/search'
import ThemeSwitch from '@/components/layout/header/theme-switch'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { StatusBadges } from '@/components/layout/header/status-badges.tsx'
import { GearIcon } from '@radix-ui/react-icons'

export function SiteHeader() {
    const { toggleSidebar } = useSidebar()

    return (
        <header className="bg-background/40 sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-tl-xl md:rounded-tr-xl">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2">
                <Button onClick={toggleSidebar} size="icon" variant="ghost">
                    <PanelLeftIcon />
                </Button>
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <Search />

                <div className="ml-auto flex items-center gap-2">
                    <StatusBadges />
                    <Separator
                        orientation="vertical"
                        className="mx-2 data-[orientation=vertical]:h-4"
                    />
                    <Notifications />
                    <ThemeSwitch />
                    <Button size="icon" variant="ghost" className="relative">
                        <GearIcon />
                        <span className="sr-only">Settings</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}
