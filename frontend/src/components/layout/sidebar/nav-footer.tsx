/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    APP_BUILD,
    APP_COPYRIGHT,
    APP_LICENCE,
    APP_NAME,
    APP_VERSION,
} from '@/lib/copyright.ts'

export function NavFooter() {
    return (
        <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="text-muted-foreground flex w-full flex-col gap-2 px-2 text-[0.6rem]">
                <div className="pb-1">
                    <div className="flex items-center justify-between">
                        <a
                            href="https://github.com/Astreon/eve-tool"
                            target="_blank"
                            className="font-medium"
                        >
                            {APP_NAME}
                        </a>
                        <span className="tabular-nums">v{APP_VERSION}</span>
                    </div>
                    <div className="flex items-center justify-between text-[0.5rem]">
                        <span className="font-medium">{APP_COPYRIGHT}</span>
                        <span className="font-medium">{APP_LICENCE}</span>
                        <span className="tabular-nums">Build {APP_BUILD}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
