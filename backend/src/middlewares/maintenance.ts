/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response, NextFunction } from 'express'
import { getMaintenanceInfo } from '../lib/maintenance.js'
import { ApiError, ApiErrorResponse } from '../types/apiResponse.js'

const PUBLIC_PATHS = ['/api/status'] // is always online

export async function maintenanceGuard(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) return next()

    const info = await getMaintenanceInfo()
    if (!info.isOn) return next()

    const payload: ApiErrorResponse = {
        success: false,
        error: {
            code: 'MAINTENANCE_MODE',
            message:
                info.reason ??
                'Service temporarily unavailable due to maintenance.',
        },
        meta: {
            startedAt: info.startedAt,
        },
    }

    return res.status(503).json(payload)
}
