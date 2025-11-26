/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import type { Request as ExpressRequest } from 'express'

export interface EsiResult<T> {
    data: T | null
    etag?: string | null
    ttl?: number | null
    expires?: string | null
    lastModified?: string | null
}

export interface DbMeta {
    etag?: string | null
    lastModified?: Date | null
    expiresAt?: Date | null
}

export interface WithEsiCacheConfig<TDb, TApi, TEsi> {
    kind: string
    keyBase: string
    freshThresholdSec: number
    fallbackTtlSec?: number

    parseId: (req: ExpressRequest) => number | string

    fetchDb: (id: number | string) => Promise<TDb | null>
    getDbMeta: (db: TDb | null) => DbMeta

    fetchEsi: (id: number | string, etag?: string) => Promise<EsiResult<TEsi>>

    upsertDbOn200: (
        id: number | string,
        payload: TEsi,
        meta: Required<Pick<DbMeta, 'etag'>> & {
            expiresAt: Date
            lastModified?: Date | null
        },
    ) => Promise<TDb>

    bumpDbMetaOn304?: (id: number | string, meta: DbMeta) => Promise<void>
    mapToApi: (db: TDb) => TApi
}
