/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { NextFunction, Request, Response } from 'express'
import crypto from 'crypto'
import { logger } from '../lib/logger.js'

interface RequestWithId extends Request {
    requestId?: string
}

export function httpLogger(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now()
    const requestId = crypto.randomUUID()
    const reqWithId = req as RequestWithId
    reqWithId.requestId = requestId

    res.setHeader('X-Request-Id', requestId)

    res.on('finish', () => {
        const durationMs = Date.now() - startedAt

        logger.info('HTTP', `${req.method} ${req.originalUrl}`, {
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
            userAgent: req.get('User-Agent') ?? undefined,
            // TODO: Add userId/characterId here, after implement Auth()
        })
    })

    next()
}
