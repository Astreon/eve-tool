/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Character } from '../../generated/client.js'

export type CharacterWithRelations = Character & {
    bloodline: { name: string }
    faction: { name: string } | null
    race: { name: string }
}
