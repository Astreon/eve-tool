// noinspection HtmlRequiredTitleElement

import React, {ReactNode} from 'react'
import {
    Outlet,
    createRootRoute,
    HeadContent,
    Scripts, Link,
} from '@tanstack/react-router'
import {TanStackDevtools} from "@tanstack/react-devtools";
import {TanStackRouterDevtoolsPanel} from "@tanstack/react-router-devtools";
import {AppThemeProvider as ThemeProvider} from "@/components/theme-provider";
import {cn} from "@/lib/utils.ts";
import appCss from '../styles/globals.css?url'

import {DEFAULT_THEME} from "@/lib/themes";
import {ActiveThemeProvider} from "@/components/active-theme.tsx";
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar.tsx";
import {AppSidebar} from "@/components/layout/sidebar/app-sidebar.tsx";
import {SiteHeader} from "@/components/layout/header";
import {Button} from "@/components/ui/button.tsx";
import {ArrowRight} from "lucide-react";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'TanStack Start Starter',
            },
        ],
        links: [
            {
                rel: 'preconnect',
                href: 'https://fonts.googleapis.com'
            },
            {
                rel: 'preconnect',
                href: 'https://fonts.gstatic.com',
            },
            {
                rel: 'stylesheet',
                href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap'
            },
            {
                rel: 'stylesheet',
                href: appCss
            },
        ],
    }),
    component: RootComponent,
    notFoundComponent: NotFoundPage
})

function RootComponent() {
    return (
        <RootDocument>
            <Outlet/>
        </RootDocument>
    )
}

function RootDocument({children}: Readonly<{ children: ReactNode }>) {
    const themeSettings = {
        preset: ('ocean-breeze') as any,
        scale: (DEFAULT_THEME.scale) as any,
        radius: (DEFAULT_THEME.radius) as any,
        contentLayout: ('full') as any
    };

    const bodyAttributes = Object.fromEntries(
        Object.entries(themeSettings)
            .filter(([_, value]) => value)
            .map(([key, value]) => [`data-theme-preset-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value])
    );

    return (
        <html suppressHydrationWarning>
        <head>
            <HeadContent/>
        </head>
        <body suppressHydrationWarning className={cn("bg-background group/layout font-sans")} {...bodyAttributes}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <ActiveThemeProvider initialTheme={themeSettings}>
                <SidebarProvider defaultOpen={false} style={{
                    "--sidebar-width": "calc(var(--spacing) * 64)",
                    "--header-height": "calc(var(--spacing) * 14)"
                } as React.CSSProperties}>
                    <AppSidebar variant="inset"/>
                    <SidebarInset>
                        <SiteHeader/>
                        <div className="flex flex-1 flex-col">
                            <div
                                className="@container/main p-4 xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto">
                                {children}
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </ActiveThemeProvider>
        </ThemeProvider>
        <TanStackDevtools
            config={{
                position: 'bottom-right',
            }}
            plugins={[
                {
                    name: 'TS Router',
                    render: <TanStackRouterDevtoolsPanel/>,
                },
            ]}
        />
        <Scripts/>
        </body>
        </html>
    )
}

function NotFoundPage() {
    return (
        <div className="bg-background grid min-h-[calc(90vh-var(--header-height))] items-center pb-8 lg:grid-cols-2 lg:pb-0">
            <div className="text-center">
                <p className="text-muted-foreground text-base font-semibold">404</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl lg:text-7xl">
                    Page not found
                </h1>
                <p className="text-muted-foreground mt-6 text-base leading-7">
                    Sorry, we couldn’t find the page you’re looking for.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-2">
                    <Button size="lg" asChild>
                        <Link to="/">Go back home</Link>
                    </Button>
                    <Button size="lg" variant="ghost">
                        Contact support <ArrowRight className="ms-2 h-4 w-4"/>
                    </Button>
                </div>
            </div>
            <div className="hidden lg:block">
                <img
                    src={`/404.svg`}
                    width={300}
                    height={400}
                    className="w-full object-contain lg:max-w-2xl"
                    alt="not found image"
                />
            </div>
        </div>
    );
}