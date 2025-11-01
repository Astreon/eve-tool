export interface ApiMeta {
  stale?: boolean
  source?: 'redis' | 'db' | 'esi'
  ttl?: number
  etag?: string
  requestId?: string
}

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: ApiMeta
}

export type ApiError = {
  success: false
  message: string
  code?: string
  meta?: ApiMeta
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError