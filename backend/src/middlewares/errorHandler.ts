// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../types/apiResponse.js'
import { AppError } from '../types/appError.js'
import config from '../config/config.js'

export function errorHandler(
  err: any,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
) {
  const appErr = AppError.fromUnknown(err)
  const status = appErr.statusCode
  const body: ApiResponse<never> = {
    success: false,
    message: appErr.message || 'Internal Server Error',
    code: appErr.code,
    meta: config.nodeEnv === 'development' ? { details: appErr.details } : undefined
  } as any
  res.status(status).json(body)
}
