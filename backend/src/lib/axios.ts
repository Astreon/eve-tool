/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import config from '../config/config.js'
import {
  AppError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../types/appError.js'
import {logger} from './logger.js'
import {redis} from './redis.js'

export const esiApi = axios.create({
  baseURL: config.esiApi.esiBaseUrl,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
    'X-Compatibility-Date': config.esiApi.esiCompatibilityDate,
    'Accept-Language': config.esiApi.esiAcceptLanguage,
  },
})

// --- Helpers
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

const randomJitter = (maxMs: number): number =>
  maxMs <= 0 ? 0 : Math.floor(Math.random() * maxMs)

type HeaderValue = string | number | string[] | undefined
type HeaderLike = Partial<AxiosHeaders> & Record<string, HeaderValue>

function normalizeHeaderValue(raw: unknown): HeaderValue | undefined {
  if (raw == null) return undefined

  if (typeof raw === 'string' || typeof raw === 'number') {
    return raw
  }

  if (Array.isArray(raw)) {
    return raw as string[]
  }

  return undefined
}

function headerNumber(headers: HeaderLike, name: string): number | undefined {
  const headerRecord = headers as Record<string, unknown>

  const rawDirect: unknown = headerRecord[name]
  const rawLower: unknown = headerRecord[name.toLowerCase()]

  const direct = normalizeHeaderValue(rawDirect)
  const lower = normalizeHeaderValue(rawLower)

  const candidates: HeaderValue[] = []
  if (direct !== undefined) candidates.push(direct)
  if (lower !== undefined && lower !== direct) candidates.push(lower)

  for (const value of candidates) {
    if (value == null) continue

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined
    }

    const str = Array.isArray(value) ? value[0] : value
    if (str == null) continue

    const n = Number(str)
    if (Number.isFinite(n)) return n
  }

  return undefined
}

let inProcCooldownUntil = 0 // epoch ms

async function readSharedCooldown(): Promise<number> {
  if (!config.esiBackoff?.shareViaRedis) return 0

  try {
    const raw = await redis.get(config.esiBackoff.key)
    if (!raw) return 0

    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
  } catch {
    return 0
  }
}

async function writeSharedCooldown(untilEpochMs: number): Promise<void> {
  if (!config.esiBackoff?.shareViaRedis) return

  try {
    const skewMs = config.esiBackoff.clockSkew ?? 0
    const jitterMs = config.esiBackoff.jitter ?? 0
    const ttlMs = Math.max(
      0,
      untilEpochMs - Date.now() + skewMs + randomJitter(jitterMs),
    )

    if (ttlMs <= 0) return

    await redis.set(
      config.esiBackoff.key,
      String(untilEpochMs),
      'PX',
      String(ttlMs),
    )
  } catch (err: unknown) {
    logger.error('ESI', 'Failed to write shared cooldown to Redis', {
      error: err,
    })
  }
}

async function maybeSleepForCooldown(): Promise<void> {
  const now = Date.now()
  const shared = await readSharedCooldown()
  const effectiveUntil = Math.max(inProcCooldownUntil, shared)

  if (now >= effectiveUntil) return

  const jitterMs = config.esiBackoff.jitter ?? 0
  const waitMs = effectiveUntil - now + randomJitter(jitterMs)
  await sleep(waitMs)
}

function setCooldownFromReset(resetSeconds: number): void {
  if (resetSeconds <= 0) return

  const skewMs = config.esiBackoff.clockSkew ?? 0
  const jitterMs = config.esiBackoff.jitter ?? 0

  const base =
    Date.now() + resetSeconds * 1000 + skewMs + randomJitter(jitterMs)

  if (base > inProcCooldownUntil) {
    inProcCooldownUntil = base
    void writeSharedCooldown(inProcCooldownUntil)
  }
}

interface EsiErrorBody {
  error?: string
  [key: string]: unknown
}

// --- Interceptors
esiApi.interceptors.request.use(
  async (
    req: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const method = (req.method ?? 'GET').toUpperCase()
    const base = req.baseURL ?? ''
    const urlPart = req.url ?? ''

    logger.info('ESI', `→ ${method} ${base}${urlPart}`)

    await maybeSleepForCooldown()

    return req
  },
  (error: AxiosError): never => {
      throw error
  },
)

esiApi.interceptors.response.use(
  (res: AxiosResponse<unknown>): AxiosResponse<unknown> => {
    const headers = res.headers as HeaderLike

    const remain =
      headerNumber(headers, 'X-Esi-Error-Limit-Remain') ??
      headerNumber(headers, 'x-esi-error-limit-remain')

    const reset =
      headerNumber(headers, 'X-Esi-Error-Limit-Reset') ??
      headerNumber(headers, 'x-esi-error-limit-reset')

    if (remain !== undefined && reset !== undefined) {
      logger.info('ESI', `Error-Limit: remain=${remain}, reset=${reset}s`)

      const softThreshold = config.esiBackoff.minRemainSoft ?? 5
      if (remain <= softThreshold && reset > 0) {
        setCooldownFromReset(reset)
      }
    }

    return res
  },
  (error: AxiosError<EsiErrorBody>): never => {
    if (error.response) {
      const {status, data, headers} = error.response

      const errorText = typeof data?.error === 'string' ? data.error : undefined
      const message = errorText ?? error.message

      const headerMap = headers as HeaderLike

      const remain =
        headerNumber(headerMap, 'X-Esi-Error-Limit-Remain') ??
        headerNumber(headerMap, 'x-esi-error-limit-remain')

      const reset =
        headerNumber(headerMap, 'X-Esi-Error-Limit-Reset') ??
        headerNumber(headerMap, 'x-esi-error-limit-reset')

      if (remain !== undefined && reset !== undefined) {
        const hardThreshold = config.esiBackoff.minRemainHard ?? 1
        if (remain <= hardThreshold && reset > 0) {
          setCooldownFromReset(reset)
        }
      }

      const safeStatus = status ?? 0

      logger.error('ESI', `[${safeStatus}] ${message}`, {
        status: safeStatus,
        remain,
        reset,
      })

      const details = {remain, reset} as const

      switch (status) {
        case 400:
          throw new BadRequestError(message, details)
        case 401:
          throw new UnauthorizedError(message, details)
        case 404:
          throw new NotFoundError(message, details)
        case 420:
        case 429:
        case 503:
          throw new AppError(message, {
            statusCode: status,
            code: 'ESI_BACKOFF',
            isOperational: true,
            details,
            cause: error,
          })
        default:
          throw new AppError(message, {
            statusCode: status ?? 500,
            code: 'ESI_HTTP_ERROR',
            isOperational: true,
            details,
            cause: error,
          })
      }
    }

    const networkMessage = `[ESI] Network Error: ${error.message}`

    logger.error('ESI', networkMessage, {stack: error.stack})

    throw new AppError(networkMessage, {
      statusCode: 502,
      code: 'NETWORK',
      isOperational: true,
      cause: error,
    })
  },
)
