import type {ReactNode} from 'react'
import {
    Outlet,
    createRootRoute,
    HeadContent,
    Scripts,
} from '@tanstack/react-router'
import {TanStackDevtools} from "@tanstack/react-devtools";
import {TanStackRouterDevtoolsPanel} from "@tanstack/react-router-devtools";
import {AppThemeProvider as ThemeProvider} from "@/components/theme-provider";
import {cn} from "@/lib/utils.ts";
import appCss from '../styles/globals.css?url'

import {DEFAULT_THEME} from "@/lib/themes";
import {ActiveThemeProvider} from "@/components/active-theme.tsx";

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
                <div className="flex flex-1 flex-col">
                <div
                    className="@container/main p-4 xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto">
                    {children}
                </div>
            </div>
            </ActiveThemeProvider>
        </ThemeProvider>
        <TanStackDevtools
            config={{
                position: 'bottom-right',
            }}
            plugins={[
                {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel/>,
                },
            ]}
        />
        <Scripts/>
        </body>
        </html>
    )
}