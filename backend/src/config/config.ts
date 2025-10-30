interface Config {
  port: number
  nodeEnv: string
  esiBaseUrl: string
  redisHost: string
  redisPort: number
  redisPassword: string
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  esiBaseUrl: process.env.ESI_BASE_URL!,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  redisPassword: process.env.REDIS_PASSWORD || '',
}

export default config