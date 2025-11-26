/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { CharacterWithRelations } from '../types/db/character.types.js'
import { CharacterApiResponse } from '../types/api/character.types.js'

export const mapCharacterToApiResponse = (
    character: CharacterWithRelations,
): CharacterApiResponse => ({
    id: character.id,
    bloodline: character.bloodline.name,
    corporationId: character.corporationId,
    name: character.name,
    race: character.race.name,
    securityStatus: character.securityStatus ?? null,
})
