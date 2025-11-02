import axios from 'axios'
import {AppError, NotFoundError, RateLimitedError} from '../types/appError.js'
import {EsiErrorContext} from "../types/axios.types.js";

export function toEsiAppError(e: unknown, ctx: EsiErrorContext = {}): AppError {
    if (axios.isAxiosError(e)) {
        const status = e.response?.status ?? 502
        const headers = (e.response?.headers ?? {}) as Record<string, any>
        const remain = headerNumber(headers, 'x-esi-error-limit-remain')
        const reset = headerNumber(headers, 'x-esi-error-limit-reset')

        const details = {
            ...ctx,
            status,
            url: ctx.url ?? e.config?.url,
            method: ctx.method ?? e.config?.method,
            remain,
            reset,
            data: e.response?.data,
        }

        if (status === 404) {
            const who = ctx.resource ? ` ${ctx.resource}` : ''
            return new NotFoundError(`ESI${who} not found`, details)
        }

        if (status === 420 || (typeof remain === 'number' && remain <= 0)) {
            return new RateLimitedError(
                `ESI rate limited${typeof reset === 'number' ? `, resets in ~${reset}s` : ''}`,
                details
            )
        }

        return new EsiError(`ESI request failed (${status})`, {statusCode: status, details, cause: e})
    }

    return new EsiError('ESI request failed', {details: {original: e}})
}

export class EsiError extends AppError {
    constructor(message: string, opts: { statusCode?: number; details?: unknown; cause?: unknown } = {}) {
        super(message, {
            statusCode: opts.statusCode ?? 502,
            code: 'ESI_HTTP_ERROR',
            isOperational: true,
            details: opts.details,
            cause: opts.cause,
        })
    }
}

function headerNumber(headers: Record<string, any>, name: string): number | undefined {
    const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === name.toLowerCase())
    const raw = entry?.[1]
    const s = Array.isArray(raw) ? raw[0] : raw
    if (typeof s !== 'string') return undefined
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : undefined
}
