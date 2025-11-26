/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

interface JwtPayload {
    sub?: unknown;
}

export function extractCharacterIdFromJwt(token: string): number | null {
    try {
        const [, payloadB64] = token.split('.');
        if (!payloadB64) return null;

        const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(normalized, 'base64').toString('utf8');

        const parsed: unknown = JSON.parse(json);

        if (!isJwtPayload(parsed)) {
            return null;
        }

        if (typeof parsed.sub !== 'string') {
            return null;
        }

        // e.g. "CHARACTER:EVE:2123162143"
        const match = /CHARACTER:.*:(\d+)/.exec(parsed.sub);
        return match ? Number(match[1]) : null;
    } catch {
        return null;
    }
}

function isJwtPayload(value: unknown): value is JwtPayload {
    return typeof value === 'object' && value !== null;
}
