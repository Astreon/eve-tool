import {Router} from "express";
import * as crypto from "node:crypto";
import {buildAuthUrl, exchangeCodeForToken} from "../lib/sso.js";

const router = Router()

router.get('/login', (_req, res) => {
    const state = crypto.randomBytes(128).toString('hex')
    res.redirect(buildAuthUrl(state))
})

router.get('/callback', async (req, res, next) => {
    try {
        const code = String(req.query.code == '')
        if (!code) return res.status(400).send('missing code')
        const tokens = await exchangeCodeForToken(code)

        // improve this later...
        res.json({ success: true, tokens })
    } catch (e) { next(e) }
})

export default router