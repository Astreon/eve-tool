/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import Logo from "@/components/layout/logo"
import {cn} from "@/lib/utils"

type AppSplashScreenProps = {
    fadingOut?: boolean
}

export function AppSplashScreen({fadingOut = false}: AppSplashScreenProps) {
    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center bg-background text-foreground",
                "transition-opacity duration-500 ease-out",
                fadingOut && "opacity-0 pointer-events-none",
            )}
        >
            <div className="flex flex-col items-center gap-4">
                <Logo
                    size={256}
                    className="me-0 drop-shadow-xl"
                />
                <p className="text-2xl text-muted-foreground">
                    Preparing EVE Toolkit
                </p>
            </div>
        </div>
    )
}
