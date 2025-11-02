import qs from 'querystring'
import axios from "axios";
import config from "../config/config.js";

const AUTH_BASE = "https://login.eveonline.com/v2/oauth"

export function buildAuthUrl(state: string) {
    const q = qs.stringify({
        response_type: "code",
        redirect_uri: config.esiSso.esiSsoRedirectUri,
        client_id: config.esiSso.esiSsoClientId,
        scope: config.esiSso.esiSsoScopes,
        state,
    })
    return `${AUTH_BASE}/authorize?${q}`
}

export async function exchangeCodeForToken(code: string) {
    const basic = Buffer.from(`${config.esiSso.esiSsoClientId}:${config.esiSso.esiSsoClientSecret}`).toString('base64')
    const res = await axios.post(`${AUTH_BASE}/token`,
        qs.stringify({ grant_type: 'authorization_code', code: code }),
        {headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }}
    )
    return res.data as {
        access_token: string
        refresh_token?: string
        expires_in: number
        token_type: 'Bearer'
    }
}

export async function refreshToken(refresh_token: string) {
    const basic = Buffer.from(`${config.esiSso.esiSsoClientId}:${config.esiSso.esiSsoClientSecret}`).toString('base64')
    const res = await axios.post(`${AUTH_BASE}/token`,
        qs.stringify({ grant_type: 'refresh_token', refresh_token: refresh_token }),
        {headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }}
    )
    return res.data as {
        access_token: string
        refresh_token?: string
        expires_in: number
        token_type: 'Bearer'
    }
}