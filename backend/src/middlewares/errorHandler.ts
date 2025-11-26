/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response, NextFunction } from 'express'
import { ApiErrorResponse, ApiResponse } from '../types/apiResponse.js'
import { AppError, BadRequestError } from '../types/appError.js'
import { z, ZodError } from 'zod'
import { logger } from '../lib/logger.js'

export function errorHandler(
    err: unknown,
    req: Request,
    res: Response<ApiResponse<never>>,
    _next: NextFunction,
) {
    const requestId = (req as any).requestId as string | undefined
    const timestamp = new Date().toISOString()

    // Zod → 400 /w details
    if (err instanceof ZodError) {
        const details = z.treeifyError(err)
        const appErr = new BadRequestError('Validation failed', details)

        logger.warn('HTTP', 'Validation error', {
            path: req.originalUrl,
            method: req.method,
            requestId,
            details,
        })

        const payload: ApiErrorResponse = {
            success: false,
            error: {
                code: appErr.code,
                message: appErr.message,
                details,
            },
            meta: {
                timestamp,
                requestId,
            },
        }

        return res.status(appErr.statusCode).json(payload)
    }

    // --- Already known AppError (e.g., from Services, Prisma, Axios-Mapping, etc.)
    if (err instanceof AppError) {
        const level: 'warn' | 'error' =
            !err.isOperational || err.statusCode >= 500 ? 'error' : 'warn'

        const logMeta = {
            path: req.originalUrl,
            method: req.method,
            requestId,
            statusCode: err.statusCode,
            code: err.code,
            isOperational: err.isOperational,
            details: err.details,
        }

        if (level === 'error') {
            logger.error('HTTP', 'AppError', logMeta)
        } else {
            logger.warn('HTTP', 'AppError', logMeta)
        }

        const payload: ApiErrorResponse = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
            meta: {
                timestamp,
                requestId,
            },
        }

        return res.status(err.statusCode).json(payload)
    }

    // --- every other unknown error
    const appErr = AppError.fromUnknown(err)

    logger.error('HTTP', 'Unhandled error', {
        path: req.originalUrl,
        method: req.method,
        requestId,
        statusCode: appErr.statusCode ?? 500,
        code: appErr.code ?? 'INTERNAL',
        details: appErr.details,
    })

    const payload: ApiErrorResponse = {
        success: false,
        error: {
            code: appErr.code ?? 'INTERNAL',
            message: appErr.message || 'Internal Server Error',
            details: appErr.details,
        },
        meta: {
            timestamp,
            requestId,
        },
    }

    return res.status(appErr.statusCode ?? 500).json(payload)
}
