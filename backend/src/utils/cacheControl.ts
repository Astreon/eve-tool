type HeadersLike = Record<string, unknown>

/** Header-Namen case-insensitiv lesen und Werte zu string normalisieren */
function getHeader(headers: HeadersLike, name: string): string | undefined {
  const lower = name.toLowerCase()
  // Axios liefert lowercase; andere Clients evtl. gemischt
  for (const [k, v] of Object.entries(headers ?? {})) {
    if (k.toLowerCase() === lower) {
      if (typeof v === 'string') return v
      if (Array.isArray(v)) return v[0]?.toString()
      if (v == null) return undefined
      return String(v)
    }
  }
  return undefined
}

/** HTTP-Datum → ms seit Epoch (undefined bei Parse-Fehler) */
function parseHttpDate(value?: string): number | undefined {
  if (!value) return undefined
  const n = Date.parse(value)
  return Number.isNaN(n) ? undefined : n
}

/** "public, max-age=123" → Map('public' => true, 'max-age' => '123') */
function parseCacheControl(raw?: string) {
  const out = new Map<string, string | true>()
  if (!raw) return out
  for (const part of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [k, v] = part.split('=', 2)
    if (v === undefined) out.set(k.toLowerCase(), true)
    else out.set(k.toLowerCase(), v.replace(/(^"|"$)/g, ''))
  }
  return out
}

/** TTL strikt relativ zur Serverzeit ("Date") berechnen */
export function computeTtlFromHeaders(headers: HeadersLike): number | undefined {
  const serverNowMs = parseHttpDate(getHeader(headers, 'date')) ?? Date.now()

  const cc = parseCacheControl(getHeader(headers, 'cache-control'))
  if (cc.has('no-store') || cc.has('no-cache')) return 0

  const ageHdr = getHeader(headers, 'age')
  const ageSeconds =
    ageHdr && /^\d+$/.test(ageHdr) ? parseInt(ageHdr, 10) : undefined

  const maxAgeRaw = cc.get('max-age')
  if (typeof maxAgeRaw === 'string' && /^\d+$/.test(maxAgeRaw)) {
    const maxAge = parseInt(maxAgeRaw, 10)
    const approxAge = Math.max(0, Math.floor((Date.now() - serverNowMs) / 1000))
    const age = ageSeconds ?? approxAge
    return Math.max(maxAge - age, 0)
  }

  const expiresMs = parseHttpDate(getHeader(headers, 'expires'))
  if (expiresMs !== undefined) {
    const ttl = Math.floor((expiresMs - serverNowMs) / 1000)
    return Math.max(ttl, 0)
  }

  return undefined
}

/** Cache-Deadline basierend auf Headers (serverseitig) bestimmen */
export function computeCacheUntil(headers: HeadersLike): Date | undefined {
  const serverNowMs = parseHttpDate(getHeader(headers, 'date')) ?? Date.now()
  const ttl = computeTtlFromHeaders(headers)
  return ttl === undefined ? undefined : new Date(serverNowMs + ttl * 1000)
}

/** ETag/LM/Expires/Date extrahieren (einheitlich) */
export function extractCachingHeaders(headers: HeadersLike) {
  return {
    etag: getHeader(headers, 'etag'), // inkl. Anführungszeichen belassen
    lastModified: getHeader(headers, 'last-modified'),
    expires: getHeader(headers, 'expires'),
    date: getHeader(headers, 'date'),
    cacheControl: getHeader(headers, 'cache-control'),
  }
}

/** Conditional-GET Header bauen */
export function buildConditionalHeaders(opts: { etag?: string | null }) {
  return opts.etag ? { 'If-None-Match': opts.etag } : {}
}
