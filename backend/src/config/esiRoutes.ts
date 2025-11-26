/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export const USED_ESI_ROUTES: { method: string; path: string }[] = [
    // --- GET
    { method: 'GET', path: '/characters/{character_id}' },
    { method: 'GET', path: '/characters/{character_id}/search' },
    { method: 'GET', path: '/meta/status' },
    { method: 'GET', path: '/status' },

    // --- POST
    { method: 'POST', path: '/universe/names' },
]
