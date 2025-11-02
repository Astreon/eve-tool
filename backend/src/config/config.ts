import {z} from "zod";

const Validator = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.string().default('production'),
    ESI_BASE_URL: z.url('https://esi.evetech.net'),
    ESI_COMPATIBILITY_DATE: z.string().default('2025-09-30'),
    ESI_ACCEPT_LANGUAGE: z.string().default('en'),
    ESI_FALLBACK_TTL_SECONDS: z.coerce.number().default(86400),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().default(''),
    CACHE_VERSION: z.string().default('v1'),
    ESI_BACKOFF_SHARE_REDIS: z.coerce.boolean().default(true),
    ESI_BACKOFF_SOFT_REMAIN: z.coerce.number().max(100).positive().default(5),
    ESI_BACKOFF_HARD_REMAIN: z.coerce.number().max(100).positive().default(1),
    ESI_BACKOFF_KEY: z.string().default('esi:cooldown-until'),
    ESI_BACKOFF_JITTER : z.coerce.number().positive().default(150),
    ESI_BACKOFF_SKEW: z.coerce.number().positive().default(250),
})

const env = Validator.parse(process.env)

interface Config {
    port: number
    nodeEnv: string
    esiBaseUrl: string
    esiCompatibilityDate: string
    esiAcceptLanguage: string
    esiFallbackTtlSeconds: number
    redisHost: string
    redisPort: number
    redisPassword: string
    cacheVersion: string
    esiBackoff: {
        shareViaRedis: boolean
        minRemainSoft: number
        minRemainHard: number
        key: string
        jitter: number
        clockSkew: number
    }
}

const config: Config = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    esiBaseUrl: env.ESI_BASE_URL,
    esiCompatibilityDate: env.ESI_COMPATIBILITY_DATE,
    esiAcceptLanguage: env.ESI_ACCEPT_LANGUAGE,
    esiFallbackTtlSeconds: env.ESI_FALLBACK_TTL_SECONDS,
    redisHost: env.REDIS_HOST,
    redisPort: env.REDIS_PORT,
    redisPassword: env.REDIS_PASSWORD,
    cacheVersion: env.CACHE_VERSION,
    esiBackoff: {
        shareViaRedis: env.ESI_BACKOFF_SHARE_REDIS,
        minRemainSoft: env.ESI_BACKOFF_SOFT_REMAIN,
        minRemainHard: env.ESI_BACKOFF_HARD_REMAIN,
        key: env.ESI_BACKOFF_KEY,
        jitter: env.ESI_BACKOFF_JITTER,
        clockSkew: env.ESI_BACKOFF_SKEW,
    }
}

export default config