import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../types/apiResponse.js'
import { AppError, BadRequestError } from '../types/appError.js'
import {z, ZodError} from 'zod'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiResponse<never>>,
  _next: NextFunction
) {
  // Zod → 400 mit Details
  if (err instanceof ZodError) {
    const appErr = new BadRequestError('Validation failed', z.treeifyError(err))
    return res.status(appErr.statusCode).json({
      success: false,
      message: appErr.message,
      code: appErr.code,
    })
  }

  const appErr = AppError.fromUnknown(err)
  return res.status(appErr.statusCode ?? 500).json({
    success: false,
    message: appErr.message || 'Internal Server Error',
    code: appErr.code ?? 'INTERNAL',
  })
}
