import {Redis} from "ioredis";
import config from "../config/config.js";

export const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    db: 0,
})


redis.on('ready', async () => {
  console.log(`[REDIS] connected to ${config.redisHost}`)
})

redis.on('error', (err) => {
  console.error('[REDIS] error', err?.message ?? err)
})