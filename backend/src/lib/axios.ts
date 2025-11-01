import axios, {AxiosError} from 'axios'
import config from '../config/config.js'
import {AppError, BadRequestError, NotFoundError, UnauthorizedError} from '../types/appError.js'
import {logger} from "./logger.js";

export const esiApi = axios.create({
    baseURL: config.esiBaseUrl,
    timeout: 10000,
    headers: {
        Accept: 'application/json',
        'X-Compatibility-Date': config.esiCompatibilityDate,
        'Accept-Language': config.esiAcceptLanguage,
    },
})

esiApi.interceptors.request.use((req) => {
    const method = (req.method ?? 'GET').toUpperCase()
    logger.info('ESI', `→ ${method} ${req.baseURL ?? ''}${req.url ?? ''}`)
    return req
})

esiApi.interceptors.response.use(
    (res) => {
        const remain = Number(res.headers['X-Esi-Error-Limit-Remain'])
        const reset = Number(res.headers['X-Esi-Error-Limit-Reset'])
        if (!Number.isNaN(remain) && !Number.isNaN(reset)) {
            logger.info('ESI', `Error-Limit: remain=${remain}, reset=${reset}s`)
        }
        return res
    },
    (error: AxiosError<any>) => {
        if (error.response) {
            const {status, data, headers} = error.response
            const msg = typeof data?.error === 'string' ? data.error : error.message
            const remain = headers?.['X-Esi-Error-Limit-Remain']
            const reset = headers?.['X-Esi-Error-Limit-Reset']
            const meta = {status, remain, reset}

            logger.error('ESI', `[${status}] ${msg}`, meta)

            switch (status) {
                case 400:
                    throw new BadRequestError(msg)
                case 401:
                    throw new UnauthorizedError(msg)
                case 404:
                    throw new NotFoundError(msg)
                default:
                    throw new AppError(msg, status, true)
            }
        }

        const networkMsg = `[ESI] Network Error: ${error.message}`
        logger.error('ESI', networkMsg, {stack: error.stack})
        throw new AppError(networkMsg, 502, true)
    }
)