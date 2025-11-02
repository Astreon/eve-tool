import {Router} from "express";
import * as crypto from "node:crypto";
import {buildAuthUrl, exchangeCodeForToken} from "../lib/sso.js";
import {redis} from "../lib/redis.js";

const router = Router()

const stateKey = (s: string) => `sso:state:${s}`

router.get('/login', async (_req, res, next) => {
    try {
        const state = crypto.randomBytes(16).toString('hex')
        await redis.set(stateKey(state), '1', 'EX', 600)
        res.redirect(buildAuthUrl(state))
    } catch (e) {
        next(e)
    }
})

router.get('/callback', async (req, res, next) => {
    try {
        const code = typeof req.query.code === 'string' ? req.query.code : ''
        const state = typeof req.query.state === 'string' ? req.query.state : ''

        if (!code) return res.status(400).send('missing code')
        if (!state) return res.status(400).send('missing state')

        const stateExists = (await redis.exists(stateKey(state))) === 1
        if (!stateExists) return res.status(400).send('invalid state')
        await redis.del(stateKey(state))

        const tokens = await exchangeCodeForToken(code)
        // TODO: persist refresh_token with user; set secure HTTP-only cookie or return payload
        res.json({success: true, tokens})
    } catch (e) {
        next(e)
    }
})

export default router