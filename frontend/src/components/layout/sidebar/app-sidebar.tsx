import * as React from "react";
import {useEffect} from "react";
import {useLocation} from "@tanstack/react-router";
import {useIsTablet} from "@/hooks/use-mobile";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from "@/components/ui/sidebar";
import {NavMain} from "@/components/layout/sidebar/nav-main";
import {NavUser} from "@/components/layout/sidebar/nav-user";
import {ScrollArea} from "@/components/ui/scroll-area";
import Logo from "@/components/layout/logo";

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar>) {
    const pathname = useLocation({select: (location) => location.pathname});
    const {setOpen, setOpenMobile, isMobile} = useSidebar();
    const isTablet = useIsTablet();

    useEffect(() => {
        if (isMobile) setOpenMobile(false);
    }, [pathname]);

    useEffect(() => {
        setOpen(!isTablet);
    }, [isTablet]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0! hover:bg-[var(--primary)]/5">
                            <Logo/>
                            <span className="font-semibold">EVE Tool</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <ScrollArea className="h-full">
                    <NavMain/>
                </ScrollArea>
            </SidebarContent>
            <SidebarFooter>
                <NavUser/>
            </SidebarFooter>
        </Sidebar>
    );
}
