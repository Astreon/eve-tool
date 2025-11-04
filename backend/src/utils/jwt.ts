export function extractCharacterIdFromJwt(token: string): number | null {
  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return null
    const json = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    const sub: string | undefined = json?.sub // z.B. "CHARACTER:EVE:2123162143"
    const m = typeof sub === 'string' ? /CHARACTER:.*:(\d+)/.exec(sub) : null
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}