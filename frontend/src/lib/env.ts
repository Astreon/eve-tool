/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE ?? '/auth'

const rawAdminId = import.meta.env.VITE_ADMIN_ID
export const ADMIN_ID = rawAdminId ? Number(rawAdminId) : null
