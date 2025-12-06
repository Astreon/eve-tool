/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

const SECURITY_CLASSES: Record<number, string> = {
    1.0: 'eve-security-10',
    0.9: 'eve-security-09',
    0.8: 'eve-security-08',
    0.7: 'eve-security-07',
    0.6: 'eve-security-06',
    0.5: 'eve-security-05',
    0.4: 'eve-security-04',
    0.3: 'eve-security-03',
    0.2: 'eve-security-02',
    0.1: 'eve-security-01',
    0.0: 'eve-security-00',
}

function clampSecurity(value: number): number {
    if (Number.isNaN(value)) return 0
    if (value <= 0) return 0
    if (value >= 1) return 1
    return value
}

export function getSecurityBand(value: number): number {
    const clamped = clampSecurity(value)
    const rounded = Math.round(clamped * 10) / 10
    return parseFloat(rounded.toFixed(1))
}

export function getSecurityClassName(value: number): string {
    const band = getSecurityBand(value)
    return SECURITY_CLASSES[band] ?? SECURITY_CLASSES[0.0]
}

export function formatSecurity(value: number): string {
    return value.toFixed(1)
}
