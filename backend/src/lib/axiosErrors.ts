/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import axios from 'axios'
import { AppError, NotFoundError, RateLimitedError } from '../types/appError.js'
import { EsiErrorContext } from '../types/axios.types.js'

export function toEsiAppError(e: unknown, ctx: EsiErrorContext = {}): AppError {
    if (axios.isAxiosError(e)) {
        const err = e

        const status = err.response?.status ?? 502
        const headers = (err.response?.headers ?? {}) as Record<string, unknown>
        const remain = headerNumber(headers, 'x-esi-error-limit-remain')
        const reset = headerNumber(headers, 'x-esi-error-limit-reset')

        const details: Record<string, unknown> = {
            ...ctx,
            status,
            url: ctx.url ?? err.config?.url,
            method: ctx.method ?? err.config?.method,
            remain,
            reset,
            data: err.response?.data as unknown,
        }

        if (status === 404) {
            const who = ctx.resource ? ` ${ctx.resource}` : ''
            return new NotFoundError(`ESI${who} not found`, details)
        }

        if (status === 420 || (typeof remain === 'number' && remain <= 0)) {
            return new RateLimitedError(
                `ESI rate limited${typeof reset === 'number' ? `, resets in ~${reset}s` : ''}`,
                details,
            )
        }

        return new EsiError(`ESI request failed (${status})`, {
            statusCode: status,
            details,
            cause: err,
        })
    }

    return new EsiError('ESI request failed', { details: { original: e } })
}

export class EsiError extends AppError {
    constructor(
        message: string,
        opts: { statusCode?: number; details?: unknown; cause?: unknown } = {},
    ) {
        super(message, {
            statusCode: opts.statusCode ?? 502,
            code: 'ESI_HTTP_ERROR',
            isOperational: true,
            details: opts.details,
            cause: opts.cause,
        })
    }
}

function headerNumber(
    headers: Record<string, unknown>,
    name: string,
): number | undefined {
    const lower = name.toLowerCase()
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lower)
    if (!key) return undefined

    const raw = headers[key]
    let s: unknown = raw

    if (Array.isArray(raw)) {
        const arr = raw as unknown[]
        s = arr[0]
    }

    if (typeof s !== 'string') return undefined
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : undefined
}
