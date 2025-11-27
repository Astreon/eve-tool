/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import type {ReactNode} from "react"
import {useEffect, useState} from "react"
import {useHydrated} from "@tanstack/react-router"
import {useAuth} from "@/components/auth/auth-provider"
import {AppSplashScreen} from "@/components/app-splash-screen"

export function AppReadyGate({children}: { children: ReactNode }) {
    const hydrated = useHydrated()
    const {isReady: authReady} = useAuth()

    const isAppReady = hydrated && authReady

    const [showSplash, setShowSplash] = useState(true)
    const [isFadingOut, setIsFadingOut] = useState(false)

    useEffect(() => {
        if (isAppReady && showSplash && !isFadingOut) {
            setIsFadingOut(true)

            const timeout = setTimeout(() => {
                setShowSplash(false)
            }, 500) // muss zur CSS duration passen

            return () => clearTimeout(timeout)
        }
    }, [isAppReady, showSplash, isFadingOut])

    return (
        <>
            {children}
            {showSplash && <AppSplashScreen fadingOut={isFadingOut}/>}
        </>
    )
}
