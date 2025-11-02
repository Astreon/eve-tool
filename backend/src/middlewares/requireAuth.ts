import {Request, Response, NextFunction} from "express";
import {UnauthorizedError} from "../types/appError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const h = req.header('authorization') || req.header('Authorization');
    if (!h || !h.startsWith('Bearer ')) return next(new UnauthorizedError('Missing Bearer token'))
    ;(req as any).esiAccessToken = h.slice('Bearer '.length)
    next()
}