/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface EsiErrorContext {
    op?: string
    url?: string
    method?: string
    resource?: string
    [k: string]: unknown
}
