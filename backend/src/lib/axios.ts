import axios, { AxiosError } from 'axios'
import config from '../config/config.js'
import { AppError } from '../types/appError.js'

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
      const { status, statusText, config } = error.response
      const message = `[ESI] ${config?.url} → ${status} - ${statusText}`
      throw new AppError(message, status)
    }
    throw new AppError(`[ESI] Network Error: ${error.message}`, 502)
  }
)