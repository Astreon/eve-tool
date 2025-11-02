import axios, {
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios'
import config from '../config/config.js'
import {logger} from './logger.js'

export const esiApi = axios.create({
    baseURL: config.esiBaseUrl,
    timeout: 10_000,
    headers: {
        Accept: 'application/json',
        'X-Compatibility-Date': config.esiCompatibilityDate,
        'Accept-Language': config.esiAcceptLanguage,
    },
})

function headerNumber(headers: Record<string, any>, name: string): number | undefined {
    const entry = Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === name.toLowerCase())
    const raw = entry?.[1]
    const s = Array.isArray(raw) ? raw[0] : raw
    if (typeof s !== 'string') return undefined
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : undefined
}

function buildUrl(req: InternalAxiosRequestConfig) {
    const base = req.baseURL ?? ''
    const url = req.url ?? ''
    return `${base}${url}`
}

esiApi.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const method = (req.method ?? 'GET').toUpperCase()
    logger.info('ESI', `→ ${method} ${buildUrl(req)}`)
    return req
})

esiApi.interceptors.response.use(
    (res: AxiosResponse) => {
        const remain = headerNumber(res.headers as any, 'x-esi-error-limit-remain')
        const reset = headerNumber(res.headers as any, 'x-esi-error-limit-reset')
        if (typeof remain === 'number' && typeof reset === 'number') {
            logger.info('ESI', `Error-Limit: remain=${remain}, reset=${reset}s`)
        }
        return res
    },
    (error: AxiosError) => {
        if (error.response) {
            const {status, headers, data} = error.response
            const remain = headerNumber(headers as any, 'x-esi-error-limit-remain')
            const reset = headerNumber(headers as any, 'x-esi-error-limit-reset')
            const msg = typeof (data as any)?.error === 'string' ? (data as any).error : error.message
            logger.error('ESI', `[${status}] ${msg}`, {
                remain,
                reset,
                url: error.config?.url,
                method: error.config?.method,
            })
        } else {
            logger.error('ESI', `[Network] ${error.message}`, {stack: error.stack})
        }
        return Promise.reject(error)
    }
)
