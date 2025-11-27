/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuItem,
    useSidebar
} from "@/components/ui/sidebar";
import {LogOut, UserCircle2Icon} from "lucide-react";
import {DotsVerticalIcon} from "@radix-ui/react-icons";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/components/auth/auth-provider";

export function NavUser() {
    const {isMobile} = useSidebar();
    const {isAuthenticated, isReady, session, login, logout} = useAuth();

    if (!isReady) {
        return <div className="h-8 w-24 rounded-full bg-muted/60 animate-pulse"/>;
    }

    if (!isAuthenticated) {
        return (
            <Button
                size="sm"
                variant="ghost"
                className="p-0 h-auto bg-transparent hover:bg-transparent"
                onClick={login}
            >
                <img
                    src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-small.png"
                    alt="Log in with EVE Online"
                    className="h-8 w-auto"
                />
            </Button>
        );
    }

    const initials = session?.characterName
        ? session.characterName.slice(0, 2).toUpperCase()
        : "CC";

    const portraitUrl = session?.characterId
        ? `https://images.evetech.net/characters/${session.characterId}/portrait?size=64`
        : undefined;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm
                                       hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                                       data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-full">
                                {portraitUrl && <AvatarImage src={portraitUrl} alt={session?.characterName}/>}
                                <AvatarFallback className="rounded-lg">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{session?.characterName}</span>
                                <span className="text-muted-foreground truncate text-xs">
                                    Character ID: {session?.characterId}
                                </span>
                            </div>

                            <DotsVerticalIcon className="ml-auto size-4"/>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    {portraitUrl && <AvatarImage src={portraitUrl} alt={session?.characterName}/>}
                                    <AvatarFallback className="rounded-lg">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {session?.characterName}
                                    </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        Character ID: {session?.characterId}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <UserCircle2Icon className="mr-2 h-4 w-4"/>
                                Account
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4"/>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
