import config from "../config/config.js";

const IS_DEV = config.nodeEnv === 'development'

function now() { return new Date().toISOString() }
function pad(line: string, indent = 2) { return ' '.repeat(indent) + line }

type Meta = Record<string, unknown> | undefined

function printHeader(kind: string, id: number | string) {
  console.log(`[${kind}] ID: ${id}`)
}

function printMeta(meta?: Meta) {
  if (!meta) return
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null) continue
    console.log(pad(`↳ ${k}: ${String(v)}`))
  }
  // Duration printed last if present and in dev
  if (IS_DEV && meta && typeof meta.durationMs === 'number') {
    console.log(pad(`↳ Duration: ${meta.durationMs}ms`))
  }
}

export function logEntity(kind: string, id: number | string, meta?: Meta) {
  printHeader(kind, id)
  printMeta(meta)
}

export const logger = {
  info(ctx: string, msg: string, meta?: Meta) {
    console.info(`${now()} [INFO] [${ctx}] ${msg}`, meta ?? '')
  },
  error(ctx: string, msg: string, meta?: Meta) {
    console.error(`${now()} [ERROR] [${ctx}] ${msg}`, meta ?? '')
  },

  entityFromRedis(kind: string, id: number | string, opts: { ttl?: number | null; cachedAt?: string | null; durationMs?: number } = {}) {
    const meta: Meta = {
      Source: 'Redis',
      TTL: opts.ttl !== undefined && opts.ttl !== null ? `${opts.ttl}s` : undefined,
      CachedAt: opts.cachedAt ?? undefined,
      durationMs: opts.durationMs,
    }
    logEntity(kind, id, meta)
  },

  entityFromEsi(kind: string, id: number | string, opts: { etag?: string | null; ttl?: number | null; durationMs?: number } = {}) {
    const meta: Meta = {
      Source: 'ESI',
      ETag: opts.etag ?? undefined,
      TTL: opts.ttl !== undefined && opts.ttl !== null ? `${opts.ttl}s` : undefined,
      durationMs: opts.durationMs,
    }
    logEntity(kind, id, meta)
  },

  entityFromDb(kind: string, id: number | string, opts: { lastUpdated?: string | null; durationMs?: number } = {}) {
    const meta: Meta = {
      Source: 'Database',
      LastUpdated: opts.lastUpdated ?? undefined,
      durationMs: opts.durationMs,
    }
    logEntity(kind, id, meta)
  }
}
