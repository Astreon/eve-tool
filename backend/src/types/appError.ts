export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'ESI_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL'
  | (string & {}) // allow other codes

export interface AppErrorOptions {
  statusCode?: number
  code?: ErrorCode
  isOperational?: boolean
  cause?: unknown
  details?: unknown // e.g. zod-error, Axios-Response, ...
}

export class AppError extends Error {
  public statusCode: number
  public code: ErrorCode
  public isOperational: boolean
  public details?: unknown

  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message)
    this.name = new.target.name
    this.statusCode = opts.statusCode ?? 500
    this.code = opts.code ?? 'INTERNAL'
    this.isOperational = opts.isOperational ?? true
    this.details = opts.details

    if (opts.cause !== undefined) {
      ;(this as any).cause = opts.cause
    }

    Object.setPrototypeOf(this, new.target.prototype)
    if (Error.captureStackTrace) Error.captureStackTrace(this, new.target)
  }

  static fromUnknown(err: unknown, fallbackMessage = 'Internal Server Error'): AppError {
    if (err instanceof AppError) return err
    if (err instanceof Error) {
      return new AppError(err.message, { cause: err, isOperational: false, code: 'INTERNAL' })
    }
    return new AppError(fallbackMessage, { isOperational: false, code: 'INTERNAL', details: { original: err } })
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: unknown) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST', details })
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED', details })
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, { statusCode: 403, code: 'FORBIDDEN', details })
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', details?: unknown) {
    super(message, { statusCode: 404, code: 'NOT_FOUND', details })
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, { statusCode: 409, code: 'CONFLICT', details })
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too Many Requests', details?: unknown) {
    super(message, { statusCode: 429, code: 'RATE_LIMITED', details })
  }
}
