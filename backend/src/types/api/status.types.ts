/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

type ServiceStatus = "Up" | "Degraded" | "Down" | "Unknown"
export type EsiRouteHealth = "Unknown" | "OK" | "Degraded" | "Down" | "Recovering";

export interface EsiGlobalStatus {
    status: ServiceStatus
    players: number | null
    serverVersion: string | null
    startTime: string | null
    latencyMs: number | null
    error: string | null
}

export interface EsiRouteStatus {
  method: string
  path: string
  status: EsiRouteHealth
}