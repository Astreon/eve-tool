export type EsiErrorContext = {
  op?: string            // z.B. "GET /characters/{character_id}/"
  url?: string           // optionaler Absolut-URL (falls bekannt)
  method?: string        // 'get' | 'post' ...
  resource?: string      // z.B. 'Character', 'Corporation' (nur für Message)
  [k: string]: unknown   // beliebige Zusatzinfos (ids etc.)
}