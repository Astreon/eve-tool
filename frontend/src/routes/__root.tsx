import type {ReactNode} from 'react'
import {
    Outlet,
    createRootRoute,
    HeadContent,
    Scripts,
} from '@tanstack/react-router'
import appCss from '../app.css?url'
import {TanStackDevtools} from "@tanstack/react-devtools";
import {TanStackRouterDevtoolsPanel} from "@tanstack/react-router-devtools";

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
                rel: 'stylesheet',
                href: appCss
            }
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
    return (
        <html>
        <head>
            <HeadContent/>
        </head>
        <body>
        {children}
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