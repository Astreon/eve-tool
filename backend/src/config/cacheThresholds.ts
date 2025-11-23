// Freshness of data living inside redis cache before it get revalidated
// higher => less revalidating (less DB/ESI-Hits, delay ux changes)
// lower => more revalidating (more DB//ESI-Hits, ux changes appears faster)

export const CACHE_THRESHOLDS = {
    CHARACTER: 60 * 10, // 10 min
    ESI_STATUS: 30_000, // 30 sec
    ESI_META: 60_000, // 1 min
} as const