/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar.tsx'
import { BugIcon } from 'lucide-react'

export function NavBug() {
    return (
        <SidebarGroup>
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="hover:text-foreground active:text-foreground hover:bg-(--primary)/10 active:bg-(--primary)/10"
                            tooltip="Report a Bug"
                            asChild
                        >
                            <a
                                href={
                                    'https://github.com/Astreon/eve-tool/issues/new?template=bug_report.md'
                                }
                                target="_blank"
                            >
                                <BugIcon className="text-red-500" />
                                <span className="text-red-400">
                                    Report a Bug
                                </span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
