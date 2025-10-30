import axios, {AxiosError} from 'axios'
import config from '../config/config.js'
import {AppError, BadRequestError, NotFoundError, UnauthorizedError} from '../types/appError.js'
import {logger} from "./logger.js";

export const esiApi = axios.create({
    baseURL: config.esiBaseUrl,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})

esiApi.interceptors.request.use((req) => {
    const method = req.method?.toLowerCase() ?? 'GET'
    const url = req.url ?? req.baseURL ?? ''
    logger.info('ESI', `${method} ${url}`)
    return req
})

esiApi.interceptors.response.use((response) => response, (error: AxiosError) => {
        if (error.response) {
            const {status, statusText, config: respConfig} = error.response
            const headers = error.response.headers
            const method = respConfig?.method?.toUpperCase() ?? 'GET'
            const url = respConfig?.url ?? respConfig?.baseURL ?? ''
            logger.error('ESI', `${method} ${url} → ${status} - ${statusText}`, {headers})

            const message = `[ESI] ${method} ${url} → ${status} - ${statusText}`

            switch (status) {
                case 400:
                    throw new BadRequestError(message)
                case 401:
                    throw new UnauthorizedError(message)
                case 404:
                    throw new NotFoundError(message)
                default:
                    throw new AppError(message, status, true)
            }
        }
        const networkMsg = `[ESI] Network Error: ${error.message}`
        logger.error('ESI', networkMsg, {stack: error.stack})
        throw new AppError(networkMsg, 502, true)
    }
)