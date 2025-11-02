export type EsiErrorContext = {
  op?: string
  url?: string
  method?: string
  resource?: string
  [k: string]: unknown
}