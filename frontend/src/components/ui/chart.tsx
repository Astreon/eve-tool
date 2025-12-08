/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
    [k in string]: {
        label?: React.ReactNode
        icon?: React.ComponentType
    } & (
        | { color?: string; theme?: never }
        | { color?: never; theme: Record<keyof typeof THEMES, string> }
    )
}

type ChartContextProps = {
    config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
    const context = React.useContext(ChartContext)

    if (!context) {
        throw new Error('useChart must be used within a <ChartContainer />')
    }

    return context
}

function ChartContainer({
    id,
    className,
    children,
    config,
    ...props
}: React.ComponentProps<'div'> & {
    config: ChartConfig
    children: React.ComponentProps<
        typeof RechartsPrimitive.ResponsiveContainer
    >['children']
}) {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-slot="chart"
                data-chart={chartId}
                className={cn(
                    "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
                    className,
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>
                    {children}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const colorConfig = Object.entries(config).filter(
        ([, config]) => config.theme || config.color,
    )

    if (!colorConfig.length) {
        return null
    }

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: Object.entries(THEMES)
                    .map(
                        ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
    .map(([key, itemConfig]) => {
        const color =
            itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
            itemConfig.color
        return color ? `  --color-${key}: ${color};` : null
    })
    .filter(Boolean)
    .join('\n')}
}
`,
                    )
                    .join('\n'),
            }}
        />
    )
}

const ChartTooltip = RechartsPrimitive.Tooltip

// --- Tooltip Types

type ChartTooltipPayloadItem = {
    name?: string | number
    value?: number | string
    dataKey?: string | number
    color?: string
    payload?: Record<string, unknown>
    [key: string]: unknown
}

type ChartTooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean
    payload?: ChartTooltipPayloadItem[]
    label?: unknown
    labelFormatter?: (
        label: React.ReactNode,
        payload: ChartTooltipPayloadItem[],
    ) => React.ReactNode
    formatter?: (
        value: number | string,
        name: string | number,
        item: ChartTooltipPayloadItem,
        index: number,
        payload: ChartTooltipPayloadItem,
    ) => React.ReactNode
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
    labelClassName?: string
    className?: string
    color?: string
}

function ChartTooltipContent({
    active,
    payload,
    className,
    indicator = 'dot',
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
    ...divProps
}: ChartTooltipContentProps) {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
        if (hideLabel || !payload?.length) {
            return null
        }

        const [item] = payload
        const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const value =
            !labelKey && typeof label === 'string'
                ? config[label as keyof typeof config]?.label || label
                : itemConfig?.label

        if (labelFormatter && payload) {
            return (
                <div className={cn('font-medium', labelClassName)}>
                    {labelFormatter(value, payload)}
                </div>
            )
        }

        if (!value) {
            return null
        }

        return <div className={cn('font-medium', labelClassName)}>{value}</div>
    }, [
        label,
        labelFormatter,
        payload,
        hideLabel,
        labelClassName,
        config,
        labelKey,
    ])

    if (!active || !payload?.length) {
        return null
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot'
    const tooltipPayload = payload ?? []

    return (
        <div
            className={cn(
                'border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
                className,
            )}
            {...divProps}
        >
            {!nestLabel ? tooltipLabel : null}
            <div className="grid gap-1.5">
                {tooltipPayload.map((item, index) => {
                    const key = `${nameKey || item.name || item.dataKey || 'value'}`
                    const itemConfig = getPayloadConfigFromPayload(
                        config,
                        item,
                        key,
                    )
                    const indicatorColor =
                        color ||
                        (item.payload && typeof item.payload === 'object'
                            ? (item.payload as any).fill
                            : undefined) ||
                        item.color

                    return (
                        <div
                            key={String(item.dataKey ?? item.name ?? index)}
                            className={cn(
                                '[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
                                indicator === 'dot' && 'items-center',
                            )}
                        >
                            {formatter &&
                            item.value !== undefined &&
                            item.name !== undefined ? (
                                formatter(
                                    item.value,
                                    item.name,
                                    item,
                                    index,
                                    item,
                                )
                            ) : (
                                <>
                                    {itemConfig?.icon ? (
                                        <itemConfig.icon />
                                    ) : (
                                        !hideIndicator && (
                                            <div
                                                className={cn(
                                                    'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                                                    {
                                                        'h-2.5 w-2.5':
                                                            indicator === 'dot',
                                                        'w-1':
                                                            indicator ===
                                                            'line',
                                                        'w-0 border-[1.5px] border-dashed bg-transparent':
                                                            indicator ===
                                                            'dashed',
                                                        'my-0.5':
                                                            nestLabel &&
                                                            indicator ===
                                                                'dashed',
                                                    },
                                                )}
                                                style={
                                                    {
                                                        '--color-bg':
                                                            indicatorColor,
                                                        '--color-border':
                                                            indicatorColor,
                                                    } as React.CSSProperties
                                                }
                                            />
                                        )
                                    )}
                                    <div
                                        className={cn(
                                            'flex flex-1 justify-between leading-none',
                                            nestLabel
                                                ? 'items-end'
                                                : 'items-center',
                                        )}
                                    >
                                        <div className="grid gap-1.5">
                                            {nestLabel ? tooltipLabel : null}
                                            <span className="text-muted-foreground">
                                                {itemConfig?.label ?? item.name}
                                            </span>
                                        </div>
                                        {item.value != null &&
                                            item.value !== '' && (
                                                <span className="text-foreground font-mono font-medium tabular-nums">
                                                    {typeof item.value ===
                                                    'number'
                                                        ? item.value.toLocaleString()
                                                        : item.value}
                                                </span>
                                            )}
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// --- Legend

const ChartLegend = RechartsPrimitive.Legend

type ChartLegendPayloadItem = {
    dataKey?: string | number
    value?: unknown
    color?: string
    [key: string]: unknown
}

type ChartLegendContentProps = React.HTMLAttributes<HTMLDivElement> & {
    payload?: ChartLegendPayloadItem[]
    verticalAlign?: 'top' | 'bottom' | 'middle'
    hideIcon?: boolean
    nameKey?: string
}

function ChartLegendContent({
    className,
    hideIcon = false,
    payload,
    verticalAlign = 'bottom',
    nameKey,
    ...divProps
}: ChartLegendContentProps) {
    const { config } = useChart()

    if (!payload || payload.length === 0) {
        return null
    }

    return (
        <div
            className={cn(
                'flex items-center justify-center gap-4',
                verticalAlign === 'top' ? 'pb-3' : 'pt-3',
                className,
            )}
            {...divProps}
        >
            {payload.map((item, index) => {
                const key = `${nameKey || item.dataKey || 'value'}`
                const itemConfig = getPayloadConfigFromPayload(
                    config,
                    item,
                    key,
                )

                return (
                    <div
                        key={String(item.value ?? item.dataKey ?? index)}
                        className={cn(
                            '[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3',
                        )}
                    >
                        {itemConfig?.icon && !hideIcon ? (
                            <itemConfig.icon />
                        ) : (
                            <div
                                className="h-2 w-2 shrink-0 rounded-[2px]"
                                style={{
                                    backgroundColor: item.color,
                                }}
                            />
                        )}
                        {itemConfig?.label}
                    </div>
                )
            })}
        </div>
    )
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
    config: ChartConfig,
    payload: unknown,
    key: string,
) {
    if (typeof payload !== 'object' || payload === null) {
        return undefined
    }

    const anyPayload = payload as Record<string, unknown>

    const payloadPayload =
        'payload' in anyPayload &&
        typeof anyPayload.payload === 'object' &&
        anyPayload.payload !== null
            ? (anyPayload.payload as Record<string, unknown>)
            : undefined

    let configLabelKey: string = key

    if (key in anyPayload && typeof anyPayload[key] === 'string') {
        configLabelKey = anyPayload[key] as string
    } else if (
        payloadPayload &&
        key in payloadPayload &&
        typeof payloadPayload[key] === 'string'
    ) {
        configLabelKey = payloadPayload[key] as string
    }

    return configLabelKey in config
        ? config[configLabelKey]
        : config[key as keyof typeof config]
}

export {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    ChartStyle,
}
