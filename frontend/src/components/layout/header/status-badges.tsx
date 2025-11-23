import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/components/ui/badge";
import {ComponentProps} from "react";

type EsiRouteHealth = "Unknown" | "OK" | "Degraded" | "Down" | "Recovering";
type ApiStatus = "Up" | "Down";

type StatusResponse = {
    ok: boolean;
    api: {
        status: ApiStatus;
        uptimeMs: number;
    };
    esi: {
        overallStatus: EsiRouteHealth;
        global: {
            status: ApiStatus | "Unknown";
            players: number | null;
            serverVersion: string | null;
            startTime: string | null;
            latencyMs: number | null;
            error: string | null;
        };
        routes: {
            method: string;
            path: string;
            status: EsiRouteHealth | string;
        }[];
    };
    timestamp: string;
};

async function fetchStatus(): Promise<StatusResponse> {
    const res = await fetch("/api/status");
    if (!res.ok) {
        throw new Error(`Status endpoint failed with HTTP ${res.status}`);
    }
    return (await res.json()) as StatusResponse;
}

function useStatusQuery() {
    return useQuery({
        queryKey: ["status"],
        queryFn: fetchStatus,
        staleTime: 60_000,
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    });
}

function esiStatusToVariant(
    status: EsiRouteHealth,
): ComponentProps<typeof Badge>["variant"] {
    switch (status) {
        case "OK":
            return "success";
        case "Degraded":
            return "warning"
        case "Recovering":
            return "info";
        case "Down":
            return "destructive";
        case "Unknown":
        default:
            return "outline";
    }
}

function esiStatusToLabel(status: EsiRouteHealth): string {
    if (status === "OK") return "Online";
    return status;
}

function apiStatusToVariant(
    status: ApiStatus,
): React.ComponentProps<typeof Badge>["variant"] {
    switch (status) {
        case "Up":
            return "success";
        case "Down":
        default:
            return "destructive";
    }
}

function apiStatusToLabel(status: ApiStatus): string {
    return status === "Up" ? "Online" : "Offline";
}

function StatusPill({
                        label,
                        status,
                        variant,
                    }: {
    label: string;
    status: string;
    variant: React.ComponentProps<typeof Badge>["variant"];
}) {
    return (
        <Badge
            variant={variant}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
        >
            <span className="hidden sm:inline">{label}</span>
            <span>{status}</span>
        </Badge>
    );
}

export function StatusBadges() {
    const {data, isLoading, isError} = useStatusQuery();

    if (!data && isError && !isLoading) {
        return null;
    }

    const esiOverall: EsiRouteHealth =
        data?.esi.overallStatus ?? (isLoading ? "Unknown" : "Down");

    const apiStatus: ApiStatus =
        data?.api.status ?? (isLoading ? "Up" : "Down");

    const players = data?.esi.global.players ?? null;

    return (
        <div className="hidden items-center gap-2 lg:flex">
            {/* Player Count */}
            <Badge
                variant="outline"
                className="px-2 py-0.5 text-xs font-mono tabular-nums"
            >
                {players !== null
                    ? `${players.toLocaleString("de-CH")} Player`
                    : isLoading
                        ? "Loading…"
                        : "n/a"}
            </Badge>

            {/* ESI API Status (aggregated) */}
            <StatusPill
                label="ESI"
                status={esiStatusToLabel(esiOverall)}
                variant={esiStatusToVariant(esiOverall)}
            />

            {/* Backend-API */}
            <StatusPill
                label="API"
                status={apiStatusToLabel(apiStatus)}
                variant={apiStatusToVariant(apiStatus)}
            />
        </div>
    );
}
