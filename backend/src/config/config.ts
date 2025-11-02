import {z} from "zod";

const ScopesSchema = z.preprocess((val) => {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    const s = val.trim().replace(/^['"]|['"]$/g, '')
    return s.split(/[,\s]+/).filter(Boolean)
  }
  return undefined
}, z.array(z.string()).nonempty().default(['publicData']))

const Validator = z.object({
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.string().default('production'),
    ESI_BASE_URL: z.url('https://esi.evetech.net'),
    ESI_COMPATIBILITY_DATE: z.string().default('2025-09-30'),
    ESI_ACCEPT_LANGUAGE: z.string().regex(/^[A-Za-z]{2}(-[A-Za-z]{2})?$/, 'invalid IETF language tag').default('en'),
    ESI_FALLBACK_TTL_SECONDS: z.coerce.number().int().positive().min(1).default(86400),
    ESI_SSO_CLIENT_ID: z.string(),
    ESI_SSO_CLIENT_SECRET: z.string(),
    ESI_SSO_REDIRECT_URI: z.url(),
    ESI_SSO_SCOPES: ScopesSchema,
    ESI_BACKOFF_SHARE_REDIS: z.coerce.boolean().default(true),
    ESI_BACKOFF_SOFT_REMAIN: z.coerce.number().int().max(100).positive().default(5),
    ESI_BACKOFF_HARD_REMAIN: z.coerce.number().int().max(100).positive().default(1),
    ESI_BACKOFF_KEY: z.string().default('esi:cooldown-until'),
    ESI_BACKOFF_JITTER: z.coerce.number().positive().int().min(0).max(2000).default(150),
    ESI_BACKOFF_SKEW: z.coerce.number().positive().int().min(0).max(2000).default(250),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().positive().int().default(6379),
    REDIS_PASSWORD: z.string().default(''),
    CACHE_VERSION: z.string().default('v1'),
})

const env = Validator.parse(process.env)

interface Config {
    port: number
    nodeEnv: string
    esiApi: {
        esiBaseUrl: string
        esiCompatibilityDate: string
        esiAcceptLanguage: string
        esiFallbackTtlSeconds: number
    }
    esiSso: {
        esiSsoClientId: string
        esiSsoClientSecret: string
        esiSsoRedirectUri: string
        esiSsoScopes: string[]
    }
    esiBackoff: {
        shareViaRedis: boolean
        minRemainSoft: number
        minRemainHard: number
        key: string
        jitter: number
        clockSkew: number
    }
    redis: {
        host: string
        port: number
        password: string
        cacheVersion: string
    }
}

const config: Config = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    esiApi: {
        esiBaseUrl: env.ESI_BASE_URL,
        esiCompatibilityDate: env.ESI_COMPATIBILITY_DATE,
        esiAcceptLanguage: env.ESI_ACCEPT_LANGUAGE,
        esiFallbackTtlSeconds: env.ESI_FALLBACK_TTL_SECONDS,
    },
    esiSso: {
        esiSsoClientId: env.ESI_SSO_CLIENT_ID,
        esiSsoClientSecret: env.ESI_SSO_CLIENT_SECRET,
        esiSsoRedirectUri: env.ESI_SSO_REDIRECT_URI,
        esiSsoScopes: env.ESI_SSO_SCOPES,
    },
    esiBackoff: {
        shareViaRedis: env.ESI_BACKOFF_SHARE_REDIS,
        minRemainSoft: env.ESI_BACKOFF_SOFT_REMAIN,
        minRemainHard: env.ESI_BACKOFF_HARD_REMAIN,
        key: env.ESI_BACKOFF_KEY,
        jitter: env.ESI_BACKOFF_JITTER,
        clockSkew: env.ESI_BACKOFF_SKEW,
    },
    redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        cacheVersion: env.CACHE_VERSION,
    }
}

export default config