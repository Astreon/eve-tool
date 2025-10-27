interface Config {
  port: number
  nodeEnv: string
  esiBaseUrl: string
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  esiBaseUrl: process.env.ESI_BASE_URL!,
}

export default config