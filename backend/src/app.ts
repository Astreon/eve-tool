/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { NotFoundError } from './types/appError.js'
import { httpLogger } from './middlewares/httpLogger.js'
import { maintenanceGuard } from './middlewares/maintenance.js'

const app = express()

app.use(express.json())
app.use(httpLogger)

app.use(maintenanceGuard)

app.use(
    cors({
        origin: ['http://localhost:3005', 'http://localhost:3000'],
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
)

app.get('/favicon.ico', (req, res) => res.send(204))
app.use(routes)

app.use((req, _res, next) => {
    next(new NotFoundError('Route not found'))
})
app.use(errorHandler)

export default app
