import {Redis} from "ioredis";
import config from "../config/config.js";

export const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    db: 0,
})