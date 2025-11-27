/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ReactFlow, Background, NodeProps, Handle, Position } from '@xyflow/react'
import type { Node as FlowNode } from '@xyflow/react'
import type { Edge as FlowEdge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

type RegionFactionApi = {
    id: number
    name: string
}

type RegionApiResponse = {
    id: number
    name: string
    x: number
    y: number
    z: number
    faction: RegionFactionApi | null
}

type ApiSuccess<T> = {
    success: true
    data: T
}

type ApiError = {
    success: false
    message: string
    code?: string
}

type ApiResponse<T> = ApiSuccess<T> | ApiError

type RegionNodeData = {
    label: string
    factionName: string | null
    factionShort: string | null
    color: string
    isNeutral: boolean
}

type RegionNode = FlowNode & {
    data: RegionNodeData
    basePosition: { x: number; y: number }
}

type RegionLinkApi = {
    fromRegionId: number
    toRegionId: number
}

async function fetchRegionLinks(): Promise<RegionLinkApi[]> {
    const res = await fetch('/api/regions/links')
    if (!res.ok) {
        throw new Error(`Failed to fetch region links (HTTP ${res.status})`)
    }

    const body = (await res.json()) as ApiResponse<RegionLinkApi[]>
    if (!body.success) {
        throw new Error(body.message || 'Failed to load region links')
    }

    return body.data
}

function useRegionLinks() {
    return useQuery({
        queryKey: ['region-links'],
        queryFn: fetchRegionLinks,
        staleTime: 60_000,
    })
}

async function fetchRegions(): Promise<RegionApiResponse[]> {
    const res = await fetch('/api/regions')
    if (!res.ok) {
        throw new Error(`Failed to fetch regions (HTTP ${res.status})`)
    }

    const body = (await res.json()) as ApiResponse<RegionApiResponse[]>

    if (!body.success) {
        throw new Error(body.message || 'Failed to load regions')
    }

    return body.data
}

const FACTION_COLORS: Record<string, string> = {
    'Amarr Empire': '#c9a46c',
    'Caldari State': '#4a90e2',
    'Gallente Federation': '#3bb273',
    'Minmatar Republic': '#c8664c',
    'Triglavian Collective': '#981b1b',
}

const FACTION_SHORT: Record<string, string> = {
    'Amarr Empire': 'Amarr',
    'Caldari State': 'Caldari',
    'Gallente Federation': 'Gallente',
    'Minmatar Republic': 'Minmatar',
    'Angel Cartel': 'Angel Cartel',
    'The Society of Conscious Thought': 'Society',
    'Thukker Tribe': 'Thukker Tribe',
    'The Syndicate': 'The Syndicate',
    'Blood Raider Covenant': 'Blood Raider',
    'Jove Empire': 'Jove Empire',
    "Sansha's Nation": 'Sansha',
}

function shortenFaction(name: string | null): string | null {
    if (!name) return null
    if (FACTION_SHORT[name]) return FACTION_SHORT[name]
    return name.split(' ')[0] ?? name
}

function relaxLayout(baseNodes: RegionNode[]): RegionNode[] {
    const nodes: RegionNode[] = baseNodes.map((n) => ({
        ...n,
        position: { ...n.position },
        basePosition: { ...n.basePosition },
    }))

    const ITERATIONS = 80
    const MIN_DIST = 90
    const MIN_DIST_SQ = MIN_DIST * MIN_DIST
    const SPRING = 0.03

    for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i]
                const b = nodes[j]

                let dx = a.position.x - b.position.x
                let dy = a.position.y - b.position.y
                let distSq = dx * dx + dy * dy

                if (distSq === 0) {
                    dx = Math.random() - 0.5
                    dy = Math.random() - 0.5
                    distSq = dx * dx + dy * dy
                }

                if (distSq < MIN_DIST_SQ) {
                    const dist = Math.sqrt(distSq)
                    const overlap = (MIN_DIST - dist) / 2
                    const ux = dx / dist
                    const uy = dy / dist

                    a.position.x += ux * overlap
                    a.position.y += uy * overlap
                    b.position.x -= ux * overlap
                    b.position.y -= uy * overlap
                }
            }
        }

        for (const node of nodes) {
            const base = node.basePosition
            node.position.x += (base.x - node.position.x) * SPRING
            node.position.y += (base.y - node.position.y) * SPRING
        }
    }

    return nodes
}

function useRegionNodes() {
    const query = useQuery({
        queryKey: ['regions'],
        queryFn: fetchRegions,
        staleTime: 60_000,
    })

    const nodes = useMemo<RegionNode[]>(() => {
        if (!query.data || query.data.length === 0) return []

        const projected = query.data.map((r) => ({
            id: r.id,
            name: r.name,
            factionName: r.faction?.name ?? null,
            factionShort: shortenFaction(r.faction?.name ?? null),
            x2d: r.x,
            y2d: -r.z,
        }))

        const xs = projected.map((p) => p.x2d)
        const ys = projected.map((p) => p.y2d)

        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const rangeX = maxX - minX || 1
        const rangeY = maxY - minY || 1

        const size = 1250
        const scale = size / Math.max(rangeX, rangeY)

        const baseNodes: RegionNode[] = projected.map((p) => {
            const x = (p.x2d - minX) * scale
            const y = (p.y2d - minY) * scale

            const isNeutral = !p.factionName
            const color = isNeutral ? '#ffffff' : FACTION_COLORS[p.factionName!] || '#888888'

            return {
                id: p.id.toString(),
                position: { x, y },
                basePosition: { x, y },
                type: 'region',
                data: {
                    label: p.name,
                    factionName: p.factionName,
                    factionShort: p.factionShort,
                    color,
                    isNeutral,
                },
                style: {
                    backgroundColor: color,
                    borderRadius: '0.3rem',
                    border: '1px solid rgba(0,0,0,0.4)',
                    boxShadow: '0 0 4px rgba(0,0,0,0.4)',
                    padding: 0,
                },
            }
        })

        return relaxLayout(baseNodes)
    }, [query.data])

    return {
        ...query,
        nodes,
    }
}

function RegionNodeComponent({ data }: NodeProps) {
    const d = data as RegionNodeData
    const { label, factionShort, isNeutral } = d

    return (
        <div
            className={`px-2 py-[2px] text-[11px] leading-tight ${
                isNeutral ? 'text-black' : 'text-white'
            }`}
        >
            <Handle
                type="source"
                position={Position.Top}
                style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
            />
            <Handle
                type="target"
                position={Position.Top}
                style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
            />
            <div className="max-w-[150px] truncate text-center font-semibold whitespace-nowrap">
                {label}
            </div>
            {factionShort && (
                <div className="mt-[1px] text-center text-[9px] opacity-80">{factionShort}</div>
            )}
        </div>
    )
}

const nodeTypes = {
    region: RegionNodeComponent,
}

export function RegionMap() {
    const {
        nodes,
        isLoading: nodesLoading,
        isError: nodesError,
        error: nodesErrorObj,
    } = useRegionNodes()
    const {
        data: links,
        isLoading: linksLoading,
        isError: linksError,
        error: linksErrorObj,
    } = useRegionLinks()

    const proOptions = { hideAttribution: true }

    if (nodesLoading || linksLoading) {
        return (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Loading regions…
            </div>
        )
    }

    if (nodesError || linksError) {
        const err = (nodesErrorObj || linksErrorObj) as Error
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-500">
                <span>Failed to load regions.</span>
                <span className="text-muted-foreground text-xs">
                    {err?.message ?? 'Unknown error'}
                </span>
            </div>
        )
    }

    const nodeIdSet = new Set(nodes.map((n) => n.id))
    const edges: FlowEdge[] =
        links
            ?.filter((link) => {
                const s = link.fromRegionId.toString()
                const t = link.toRegionId.toString()
                return nodeIdSet.has(s) && nodeIdSet.has(t)
            })
            .map((link) => ({
                id: `${link.fromRegionId}-${link.toRegionId}`,
                source: link.fromRegionId.toString(),
                target: link.toRegionId.toString(),
                type: 'straight',
                selectable: false,
                focused: false,
                interactionWidth: 0,
                animated: false,
                style: {
                    stroke: '#8a09cf',
                    strokeWidth: 1.5,
                    opacity: 0.6,
                    pointerEvents: 'none',
                },
            })) ?? []

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.04 }}
            proOptions={proOptions}
            nodeOrigin={[0.5, 0.5]}
            className="h-full w-full"
            minZoom={0.85}
            maxZoom={1.85}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
        >
            <Background />
        </ReactFlow>
    )
}
