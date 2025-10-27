import { Request, Response, NextFunction } from 'express'
import { getCharacterInfo} from '../services/esi/index.js'
import { ApiResponse } from '../types/apiResponse.js'
import { EveCharacter } from '../types/eve.types.js'
import { AppError } from '../types/appError.js'

export const getCharacter = async (
  req: Request,
  res: Response<ApiResponse<EveCharacter>>,
  next: NextFunction,
) => {
  const id = Number(req.params.id)

  if (!id || isNaN(id))
    return next(new AppError('Invalid character ID', 400))

  const data = await getCharacterInfo(id)

  res.json({
    success: true,
    data,
  })
}