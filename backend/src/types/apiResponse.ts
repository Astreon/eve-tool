/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type ApiSuccessResponse<T, M = Record<string, unknown>> = {
    success: true
    data: T
    meta?: M
}

export type ApiError = {
    code: string
    message: string
    details?: unknown
}

export type ApiErrorResponse<M = Record<string, unknown>> = {
    success: false
    error: ApiError
    meta?: M
}

export type ApiResponse<T, M = Record<string, unknown>> =
    | ApiSuccessResponse<T, M>
    | ApiErrorResponse<M>
