// src/utils/params.ts
import { z } from 'zod'
import { BadRequestError, NotFoundError } from '../types/appError.js'
import type { Request as ExpressRequest } from 'express'

type Range = { min: number; max: number }
type ParseNumericOpts = {
  min?: number
  max?: number
  ranges?: ReadonlyArray<Readonly<Range>>
  notFoundIfOutOfRange?: boolean
}

export const parseNumericIdFromParams =
  (paramName = 'id', opts: ParseNumericOpts = {}) =>
  (req: ExpressRequest) => {
    const schema = z.object({ [paramName]: z.coerce.number().int().positive() })
    const result = schema.safeParse(req.params)
    if (!result.success) {
      throw new BadRequestError('Invalid path parameter', z.treeifyError(result.error))
    }
    const id = result.data[paramName] as number

    // Prefer ranges if provided
    if (opts.ranges && opts.ranges.length > 0) {
      const inAny = opts.ranges.some(r => id >= r.min && id <= r.max)
      if (!inAny) {
        if (opts.notFoundIfOutOfRange) throw new NotFoundError('Not Found')
        throw new BadRequestError('ID out of allowed ranges')
      }
      return id
    }

    // Fallback to simple min/max (optional)
    if (opts.min !== undefined && id < opts.min) {
      if (opts.notFoundIfOutOfRange) throw new NotFoundError('Not Found')
      throw new BadRequestError('ID out of range (min)')
    }
    if (opts.max !== undefined && id > opts.max) {
      if (opts.notFoundIfOutOfRange) throw new NotFoundError('Not Found')
      throw new BadRequestError('ID out of range (max)')
    }
    return id
  }
