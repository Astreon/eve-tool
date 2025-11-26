/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type ApiSuccessResponse<T> = {
    success: true
    data: T
    meta?: Record<string, unknown>
}

export type ApiError = {
    code: string
    message: string
    details?: unknown
}

export type ApiErrorResponse = {
    success: false
    error: ApiError
    meta?: Record<string, unknown>
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
