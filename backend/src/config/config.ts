import {z} from "zod";

const Validator = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.string().default('production'),
    ESI_BASE_URL: z.url('https://esi.evetech.net'),
    ESI_COMPATIBILITY_DATE: z.string().default('2025-09-30'),
    ESI_ACCEPT_LANGUAGE: z.string().default('en'),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().default(''),
    CACHE_VERSION: z.string().default('v1'),
})

const env = Validator.parse(process.env)

interface Config {
    port: number
    nodeEnv: string
    esiBaseUrl: string
    esiCompatibilityDate: string
    esiAcceptLanguage: string
    redisHost: string
    redisPort: number
    redisPassword: string
    cacheVersion: string
}

const config: Config = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    esiBaseUrl: env.ESI_BASE_URL,
    esiCompatibilityDate: env.ESI_COMPATIBILITY_DATE,
    esiAcceptLanguage: env.ESI_ACCEPT_LANGUAGE,
    redisHost: env.REDIS_HOST,
    redisPort: env.REDIS_PORT,
    redisPassword: env.REDIS_PASSWORD,
    cacheVersion: env.CACHE_VERSION,
}

export default config