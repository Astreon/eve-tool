type ServiceStatus = "Up" | "Degraded" | "Down" | "Unknown"
export type EsiRouteHealth = "Unknown" | "OK" | "Degraded" | "Down" | "Recovering";

export type EsiGlobalStatus = {
    status: ServiceStatus
    players: number | null
    serverVersion: string | null
    startTime: string | null
    latencyMs: number | null
    error: string | null
}

export type EsiRouteStatus = {
  method: string
  path: string
  status: EsiRouteHealth
};