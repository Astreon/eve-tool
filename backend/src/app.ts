/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import express from 'express';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './types/appError.js';
import { httpLogger } from './middlewares/httpLogger.js';

const app = express();

app.use(express.json());
app.use(httpLogger);
app.use(routes);

app.use((req, _res, next) => {
    next(new NotFoundError('Route not found'));
});
app.use(errorHandler);

export default app;
