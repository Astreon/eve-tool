//app.js
import express from 'express'
import routes from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.js'
import {NotFoundError} from "./types/appError.js";

const app = express()

app.use(express.json())
app.use(routes)

app.use((req, _res, next) => next(new NotFoundError('Route not found')))
app.use(errorHandler)

export default app