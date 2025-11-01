import {makeCachedController, parseNumericIdFromParams} from "../lib/esiCache.js";
import { prisma } from '../lib/prisma.js'
import { CACHE_THRESHOLDS } from '../config/cacheThresholds.js'
import config from '../config/config.js'
import { getCharacterInfo } from '../services/esi/index.js'
import { mapCharacterToApiResponse } from '../mappers/character.mapper.js'
import { CharacterWithRelations } from '../types/db.types.js'
import { CharacterApiResponse } from '../types/api.types.js'
import { EsiCharacter } from '../types/esi.types.js'

export const getCharacter = makeCachedController<
  CharacterWithRelations,
  CharacterApiResponse,
  EsiCharacter
>({
  kind: 'CHARACTER',
  keyBase: 'character',
  freshThresholdSec: CACHE_THRESHOLDS.CHARACTER,
  fallbackTtlSec: config.esiFallbackTtlSeconds,
  parseId: parseNumericIdFromParams('id'),

  fetchDb: async (id) =>
    prisma.character.findUnique({
      where: { id: Number(id) },
      include: { race: { select: { name: true } }, bloodline: { select: { name: true } } },
    }) as any,

  getDbMeta: (row) => ({
    etag: (row as any)?.etag ?? null,
    expiresAt: (row as any)?.expiresAt ?? null,
    lastUpdated: (row as any)?.updatedAt ?? null,
    lastModified: (row as any)?.lastModified ?? null,
  }),

  fetchEsi: (id, etag) => getCharacterInfo(Number(id), etag),

  upsertDbOn200: async (id, payload, meta) => {
    const upserted = await prisma.character.upsert({
      where: { id: Number(id) },
      create: {
        id: Number(id),
        name: payload.name,
        corporationId: payload.corporation_id,
        raceId: payload.race_id,            // required
        bloodlineId: payload.bloodline_id,  // required
        securityStatus: payload.security_status ?? null,
        etag: meta.etag ?? null,
        lastModified: meta.lastModified ?? null,
        expiresAt: meta.expiresAt,
      } as any,
      update: {
        name: payload.name,
        corporationId: payload.corporation_id,
        raceId: payload.race_id,
        bloodlineId: payload.bloodline_id,
        securityStatus: payload.security_status ?? null,
        etag: meta.etag ?? null,
        lastModified: meta.lastModified ?? null,
        expiresAt: meta.expiresAt,
      } as any,
      include: { race: { select: { name: true } }, bloodline: { select: { name: true } } },
    })
    return upserted as any
  },

  bumpDbMetaOn304: async (id, meta) => {
    const data: any = { updatedAt: new Date() }
    if (meta.etag !== undefined) data.etag = meta.etag
    if (meta.lastModified !== undefined) data.lastModified = meta.lastModified
    if (meta.expiresAt !== undefined) data.expiresAt = meta.expiresAt
    await prisma.character.update({ where: { id: Number(id) }, data }).catch(() => {})
  },

  mapToApi: (row) => mapCharacterToApiResponse(row as any),
})
