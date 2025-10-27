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

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  })
}