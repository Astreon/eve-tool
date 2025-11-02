import { prisma } from '../lib/prisma.js'
import { CharacterWithRelations } from '../types/db.types.js'
import { DbMeta } from '../types/cache.types.js'
import { CharacterApiResponse } from '../types/api.types.js'
import { mapCharacterToApiResponse } from '../mappers/character.mapper.js'
import { getCharacterInfo } from '../services/esi/index.js'
import { CACHE_THRESHOLDS } from '../config/cacheThresholds.js'
import config from '../config/config.js'
import { makeCachedController } from '../lib/esiCache.js'
import { parseNumericIdFromParams } from '../utils/params.js'

// ------- ESI: API-Ranges -------
const CHARACTER_ID_RANGES: ReadonlyArray<{ min: number; max: number }> = [
  { min: 90_000_000,    max: 97_999_999 },
  { min: 100_000_000,   max: 2_099_999_999 },
  { min: 2_100_000_000, max: 2_111_999_999 },
  { min: 2_112_000_000, max: 2_129_999_999 },
]

// ------- Fetch: DB -------
const fetchDb = async (id: number | string): Promise<CharacterWithRelations | null> => {
  return await prisma.character.findUnique({
    where: { id: Number(id) },
    include: {
      race: { select: { name: true } },
      bloodline: { select: { name: true } },
    },
  }) as unknown as CharacterWithRelations | null
}

// ------- Extract meta from db -------
const getDbMeta = (row: CharacterWithRelations | null): DbMeta => ({
  etag: row?.etag ?? undefined,
  expiresAt: row?.expiresAt ?? undefined,
  lastModified: row?.lastModified ?? undefined,
})

// ------- ESI-Call -------
const fetchEsi = (id: number | string, etag?: string) => getCharacterInfo(Number(id), etag)

// ------- Upsert if 200 (ESI) -------
const upsertDbOn200 = async (
  id: number | string,
  payload: Awaited<ReturnType<typeof fetchEsi>> extends { data: infer T } ? T : never,
  meta: Required<Pick<DbMeta, 'etag'>> & { expiresAt: Date; lastModified?: Date | null }
): Promise<CharacterWithRelations> => {
  if (!payload) throw new Error('ESI payload missing')

  if (payload.race_id == null || payload.bloodline_id == null) {
    throw new Error('ESI returned null for required fields race_id/bloodline_id')
  }

  const upserted = await prisma.character.upsert({
    where: { id: Number(id) },
    create: {
      id: Number(id),
      name: payload.name,
      corporationId: payload.corporation_id,
      raceId: payload.race_id,
      bloodlineId: payload.bloodline_id,
      securityStatus: payload.security_status ?? null,
      etag: meta.etag ?? null,
      lastModified: meta.lastModified ?? null,
      expiresAt: meta.expiresAt,
    },
    update: {
      name: payload.name,
      corporationId: payload.corporation_id,
      raceId: payload.race_id,
      bloodlineId: payload.bloodline_id,
      securityStatus: payload.security_status ?? null,
      etag: meta.etag ?? null,
      lastModified: meta.lastModified ?? null,
      expiresAt: meta.expiresAt,
    },
    include: {
      race: { select: { name: true } },
      bloodline: { select: { name: true } },
    },
  })

  return upserted as unknown as CharacterWithRelations
}

// ------- 304 bump -------
const bumpDbMetaOn304 = async (id: number | string, meta: DbMeta) => {
  await prisma.character
    .update({
      where: { id: Number(id) },
      data: {
        etag: meta.etag ?? null,
        lastModified: meta.lastModified ?? null,
        expiresAt: meta.expiresAt ?? null,
      },
    })
    .catch(() => {
    })
}

// ------- Mapper -------
const mapToApi = (row: CharacterWithRelations): CharacterApiResponse =>
  mapCharacterToApiResponse(row)

// ------- Wrapper-Instance for Characters -------
export const getCharacter = makeCachedController<CharacterWithRelations, CharacterApiResponse, any>({
  kind: 'CHARACTER',
  keyBase: 'character',
  freshThresholdSec: CACHE_THRESHOLDS.CHARACTER,
  fallbackTtlSec: config.esiApi.esiFallbackTtlSeconds,

  parseId: parseNumericIdFromParams('id', {
    ranges: CHARACTER_ID_RANGES,
    notFoundIfOutOfRange: true,
  }),

  fetchDb,
  getDbMeta,
  fetchEsi,
  upsertDbOn200,
  bumpDbMetaOn304,
  mapToApi,
})
