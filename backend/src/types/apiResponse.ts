/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface ApiMeta {
  stale?: boolean
  source?: 'redis' | 'db' | 'esi'
  ttl?: number
  etag?: string
  requestId?: string
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: ApiMeta
}

export interface ApiError {
  success: false
  message: string
  code?: string
  meta?: ApiMeta
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError