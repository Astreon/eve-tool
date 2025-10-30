import { Request, Response, NextFunction } from 'express'
import { AppError } from '../types/appError.js'
import { ApiResponse } from '../types/apiResponse.js'


export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response<ApiResponse<null>>,
  _next: NextFunction
) => {
  console.error(`[ERROR] ${err.message}`)

  const status = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal Server Error'

  res.status(status).json({
    success: false,
    message
  })
}