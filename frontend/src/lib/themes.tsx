/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type ThemeRadius = 'default' | 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type ThemePreset = 'default' | 'ocean-breeze'
export type ThemeScale = 'none' | 'xs' | 'lg'
export type ThemeContentLayout = 'default' | 'full' | 'centered'

export type ThemeType = {
    radius: ThemeRadius
    preset: ThemePreset
    scale: ThemeScale
    contentLayout: ThemeContentLayout
}

export const DEFAULT_THEME: ThemeType = {
    preset: 'ocean-breeze',
    radius: 'sm',
    scale: 'none',
    contentLayout: 'full',
}
