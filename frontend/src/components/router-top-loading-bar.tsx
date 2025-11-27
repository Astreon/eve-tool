/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {useEffect, useRef} from "react";
import LoadingBar, {
    type LoadingBarRef,
} from "react-top-loading-bar";
import {useRouterState} from "@tanstack/react-router";

export function RouterTopLoadingBar() {
    const ref = useRef<LoadingBarRef | null>(null);
    const routerState = useRouterState()

    const isLoading =
        routerState.isLoading ||
        routerState.isTransitioning ||
        ((routerState.pendingMatches?.length ?? 0) > 0)

    useEffect(() => {
        if (!ref.current) return

        if (isLoading) {
            ref.current.continuousStart()
        } else {
            ref.current.complete()
        }
    }, [isLoading])

    return (
        <LoadingBar
            ref={ref}
            height={2}
            color="var(--primary)"
            shadow={false}
            waitingTime={200}
            loaderSpeed={300}
            className="z-[9999]"
            containerClassName="fixed top-0 left-0 right-0"
        />
    );
}
