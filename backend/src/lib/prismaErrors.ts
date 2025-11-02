import { Prisma } from "../generated/client.js"
import { ConflictError, NotFoundError, AppError } from '../types/appError.js'

export function mapPrismaError(e: unknown): AppError {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return new ConflictError('Unique constraint violated', e.meta)
    if (e.code === 'P2025') return new NotFoundError('Record not found', e.meta)
  }
  return AppError.fromUnknown(e)
}
