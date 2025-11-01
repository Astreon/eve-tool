export type EsiResult<T> = {
    data: T | null
    etag?: string | null
    ttl?: number | null
    expires?: string | null
    lastModified?: string | null
}