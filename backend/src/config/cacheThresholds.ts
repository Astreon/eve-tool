/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

// Freshness of data living inside redis cache before it get revalidated
// higher => less revalidating (less DB/ESI-Hits, delay ux changes)
// lower => more revalidating (more DB//ESI-Hits, ux changes appears faster)

export const CACHE_THRESHOLDS = {
    CHARACTER: 60 * 10, // 10 min
    REGIONS: 60 * 60 * 24, // 1 day
    ESI_STATUS: 30_000, // 30 sec
    ESI_META: 60_000, // 1 min
} as const