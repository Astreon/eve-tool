import axios, {AxiosError} from 'axios'
import config from '../config/config.js'
import {AppError, BadRequestError, NotFoundError, UnauthorizedError} from '../types/appError.js'

export const esiApi = axios.create({
    baseURL: config.esiBaseUrl,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})

esiApi.interceptors.request.use((req) => {
    console.log(`[ESI] ${req.method?.toUpperCase()} ${req.url}`)
    return req
})

esiApi.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response) {
            const {status, statusText, config} = error.response
            const message = `[ESI] ${config?.url} → ${status} - ${statusText}`

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

        throw new AppError(`[ESI] Network Error: ${error.message}`, 502, true)
    }
)