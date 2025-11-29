/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { redis } from './redis.js'

const MAINTENANCE_KEY = 'runtime:maintenance'

export type MaintenanceInfo = {
    isOn: boolean
    reason?: string
    startedAt?: string
}

export async function getMaintenanceInfo(): Promise<MaintenanceInfo> {
    const raw = await redis.get(MAINTENANCE_KEY)
    if (!raw) return { isOn: false }

    try {
        const parsed = JSON.parse(raw) as {
            reason?: string
            startedAt?: string
        }
        return {
            isOn: true,
            reason: parsed.reason,
            startedAt: parsed.startedAt,
        }
    } catch {
        return { isOn: true }
    }
}

export async function setMaintenanceMode(
    isOn: boolean,
    reason?: string,
): Promise<void> {
    if (!isOn) {
        await redis.del(MAINTENANCE_KEY)
        return
    }

    const payload = JSON.stringify({
        reason: reason ?? 'Maintenance in progress',
        startedAt: new Date().toISOString(),
    })

    await redis.set(MAINTENANCE_KEY, payload)
}
