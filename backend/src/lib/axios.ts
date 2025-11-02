import axios, {AxiosError, InternalAxiosRequestConfig, AxiosResponse, AxiosHeaders} from 'axios'
import config from '../config/config.js'
import {AppError, BadRequestError, NotFoundError, UnauthorizedError} from '../types/appError.js'
import {logger} from './logger.js'
import {redis} from './redis.js'

export const esiApi = axios.create({
    baseURL: config.esiApi.esiBaseUrl,
    timeout: 10000,
    headers: {
        Accept: 'application/json',
        'X-Compatibility-Date': config.esiApi.esiCompatibilityDate,
        'Accept-Language': config.esiApi.esiAcceptLanguage,
    },
})

// --- Helpers
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const jitter = (n: number) => (n <= 0 ? 0 : Math.floor(Math.random() * n))

function headerNumber(
    headers: Partial<AxiosHeaders & Record<string, any>>,
    name: string
): number | undefined {
    const v = (headers as any)?.[name] ?? (headers as any)?.[name.toLowerCase()]
    if (v == null) return undefined
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
}

let inProcCooldownUntil = 0 // Epoch ms

async function readSharedCooldown(): Promise<number> {
    if (!config.esiBackoff?.shareViaRedis) return 0
    try {
        const raw = await redis.get(config.esiBackoff.key)
        return raw ? Math.max(0, parseInt(raw, 10)) : 0
    } catch {
        return 0
    }
}

async function writeSharedCooldown(until: number): Promise<void> {
    if (!config.esiBackoff?.shareViaRedis) return
    try {
        const ttlMs = Math.max(0, until - Date.now() + (config.esiBackoff.clockSkew ?? 0))
        // PX = ms TTL
        if (ttlMs > 0) await redis.set(config.esiBackoff.key, String(until), 'PX', ttlMs)
    } catch {
        // ignore
    }
}

async function maybeSleepForCooldown() {
    const now = Date.now()
    const shared = await readSharedCooldown()
    const until = Math.max(inProcCooldownUntil, shared)
    if (now < until) {
        const wait = until - now + (config.esiBackoff.jitter ?? 0)
        await sleep(wait + jitter(50))
    }
}

function setCooldownFromReset(resetSec: number) {
    const skew = config.esiBackoff.clockSkew ?? 0
    const base = Date.now() + Math.max(0, resetSec) * 1000 + skew + jitter(config.esiBackoff.jitter ?? 0)
    inProcCooldownUntil = Math.max(inProcCooldownUntil, base)
    void writeSharedCooldown(inProcCooldownUntil)
}

// --- Interceptors
esiApi.interceptors.request.use(
    async (req: InternalAxiosRequestConfig) => {
        const method = (req.method ?? 'GET').toUpperCase()
        logger.info('ESI', `→ ${method} ${req.baseURL ?? ''}${req.url ?? ''}`)
        await maybeSleepForCooldown()
        return req
    },
    (error) => Promise.reject(error)
)

esiApi.interceptors.response.use(
    async (res: AxiosResponse<any>) => {
        const remain =
            headerNumber(res.headers as any, 'X-Esi-Error-Limit-Remain') ??
            headerNumber(res.headers as any, 'x-esi-error-limit-remain')
        const reset =
            headerNumber(res.headers as any, 'X-Esi-Error-Limit-Reset') ??
            headerNumber(res.headers as any, 'x-esi-error-limit-reset')

        if (remain !== undefined && reset !== undefined) {
            logger.info('ESI', `Error-Limit: remain=${remain}, reset=${reset}s`)

            // Soft-Backoff (wait till reset)
            if (remain <= (config.esiBackoff.minRemainSoft ?? 5) && reset > 0) {
                setCooldownFromReset(reset)
            }
        }
        return res
    },
    async (error: AxiosError<any>) => {
        if (error.response) {
            const {status, data, headers} = error.response
            const msg = typeof data?.error === 'string' ? data.error : error.message

            const remain =
                headerNumber(headers as any, 'X-Esi-Error-Limit-Remain') ??
                headerNumber(headers as any, 'x-esi-error-limit-remain')
            const reset =
                headerNumber(headers as any, 'X-Esi-Error-Limit-Reset') ??
                headerNumber(headers as any, 'x-esi-error-limit-reset')

            // Hard-Backoff: if remain extremely low/empty
            if (remain !== undefined && reset !== undefined) {
                if (remain <= (config.esiBackoff.minRemainHard ?? 1) && reset > 0) {
                    setCooldownFromReset(reset)
                }
            }

            logger.error('ESI', `[${status}] ${msg}`, {status, remain, reset})

            switch (status) {
                case 400:
                    throw new BadRequestError(msg, { remain, reset })
                case 401:
                    throw new UnauthorizedError(msg, { remain, reset })
                case 404:
                    throw new NotFoundError(msg, { remain, reset })
                case 420:
                case 429:
                case 503:
                    // Backoff via Header already set
                    throw new AppError(msg, {
                        statusCode: status,
                        code: 'ESI_BACKOFF',
                        isOperational: true,
                        details: {remain, reset},
                        cause: error,
                    })
                default:
                    throw new AppError(msg, {
                        statusCode: status,
                        code: 'ESI_HTTP_ERROR',
                        isOperational: true,
                        details: {remain, reset},
                        cause: error,
                    })
            }
        }

        const networkMsg = `[ESI] Network Error: ${error.message}`
        logger.error('ESI', networkMsg, {stack: error.stack})
        throw new AppError(networkMsg, {
            statusCode: 502,
            code: 'NETWORK',
            isOperational: true,
            cause: error,
        })
    }
)
