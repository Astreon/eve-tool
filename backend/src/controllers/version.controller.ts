/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response } from 'express'
import {
    APP_NAME,
    APP_VERSION,
    APP_BUILD,
    APP_COPYRIGHT,
    APP_LICENCE,
} from '../config/version.js'
import { ApiResponse } from '../types/apiResponse.js'
import { VersionApiResponse } from '../types/api/version.types.js'
import config from '../config/config.js'

export function getVersion(
    _req: Request,
    res: Response<ApiResponse<VersionApiResponse>>,
) {
    const data: VersionApiResponse = {
        name: APP_NAME,
        version: APP_VERSION,
        build: APP_BUILD,
        copyright: APP_COPYRIGHT,
        licence: APP_LICENCE,
    }

    return res.json({
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            nodeEnv: config.nodeEnv,
        },
    })
}
