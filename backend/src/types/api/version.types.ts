/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface VersionInfo {
    name: string
    version: string
    build: string
    copyright: string
    licence: string
}

export type VersionApiResponse = VersionInfo
