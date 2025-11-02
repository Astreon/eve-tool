import {Redis} from "ioredis";
import config from "../config/config.js";

export const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: 0,
})


redis.on('ready', async () => {
  console.log(`[REDIS] connected to ${config.redis.host}`)
})

redis.on('error', (err) => {
  console.error('[REDIS] error', err?.message ?? err)
})