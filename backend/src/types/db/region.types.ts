/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Region } from '@eve-toolkit/db'

export type RegionWithRelations = Region & {
    faction: { name: string }
}
