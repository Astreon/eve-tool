/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { Edge as FlowEdge, Node as FlowNode, NodeChange } from '@xyflow/react'
import { Background, Handle, NodeProps, Position, ReactFlow, applyNodeChanges } from '@xyflow/react'
import { API_BASE } from '@/lib/env'
import '@xyflow/react/dist/style.css'

// --- API Types (from Backend)
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

export type SystemBorderType = 'INTERNAL' | 'CONSTELLATION' | 'REGION'

export type RegionSystemNodeApi = {
    id: number
    name: string
    x: number
    y: number
    z: number
    constellationId: number
    regionId: number
    regionName: string
    isForeign: boolean
    layoutX?: number | null
    layoutY?: number | null
}

export type RegionSystemEdgeApi = {
    fromSystemId: number
    toSystemId: number
    borderType: SystemBorderType
}

type RegionMapApiResponse = {
    region: RegionApiResponse
    systems: RegionSystemNodeApi[]
    edges: RegionSystemEdgeApi[]
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

// --- Fetch / Query ---
async function fetchRegionMap(regionId: number): Promise<RegionMapApiResponse> {
    const res = await fetch(`${API_BASE}/regions/${regionId}/map`)
    if (!res.ok) {
        throw new Error(`Failed to fetch region map (HTTP ${res.status})`)
    }

    const body = (await res.json()) as ApiResponse<RegionMapApiResponse>

    if (!body.success) {
        throw new Error(body.message || 'Failed to load region universe')
    }

    return body.data
}

type UpdateRegionLayoutPayload = {
    systemId: number
    x: number
    y: number
}

async function updateRegionLayoutApi(
    regionId: number,
    payload: UpdateRegionLayoutPayload,
): Promise<void> {
    const res = await fetch(`${API_BASE}/regions/${regionId}/layout`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    const rawText = await res.text()

    if (!res.ok) {
        let body: ApiResponse<unknown> | null = null
        try {
            body = JSON.parse(rawText) as ApiResponse<unknown>
        } catch {
            // ignore JSON parse error
        }

        const msg =
            (body && !body.success && 'message' in body && body.message) ||
            rawText ||
            `Failed to update region layout (HTTP ${res.status})`
        throw new Error(msg)
    }

    if (rawText) {
        let body: ApiResponse<unknown> | null = null
        try {
            body = JSON.parse(rawText) as ApiResponse<unknown>
        } catch {
            // ignore
        }
        if (body && !body.success) {
            throw new Error(body.message || 'Failed to update region layout')
        }
    }
}

function useRegionMap(regionId: number) {
    return useQuery({
        queryKey: ['region-universe', regionId],
        queryFn: () => fetchRegionMap(regionId),
        staleTime: 60_000,
    })
}

// --- Layout & Node Types
type SystemNodeData = {
    label: string
    subLabel: string | null
    isForeign: boolean
}

type SystemNode = FlowNode<SystemNodeData> & {
    basePosition: { x: number; y: number }
}

function relaxLayout(baseNodes: SystemNode[]): SystemNode[] {
    const nodes: SystemNode[] = baseNodes.map((n) => ({
        ...n,
        position: { ...n.position },
        basePosition: { ...n.basePosition },
    }))

    const ITERATIONS = 80
    const MIN_DIST = 60
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

function getIsDarkMode(): boolean {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
}

function getEdgeColor(borderType: SystemBorderType, isDark: boolean): string {
    switch (borderType) {
        case 'INTERNAL':
            return isDark ? '#ffffff' : '#000000'
        case 'CONSTELLATION':
            return '#ff3b3b'
        case 'REGION':
            return '#8a09cf'
        default:
            return isDark ? '#ffffff' : '#000000'
    }
}

function SystemNodeComponent({ data }: NodeProps) {
    const { label, subLabel, isForeign } = data as SystemNodeData

    return (
        <div className="bg-background/90 ring-border rounded-sm px-2 py-[2px] text-[10px] leading-tight shadow-sm ring-1">
            <Handle
                type="source"
                position={Position.Top}
                isConnectable={false}
                style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                }}
            />
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={false}
                style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                }}
            />
            <div className="max-w-[140px] truncate text-center font-medium whitespace-nowrap">
                {label}
            </div>
            {subLabel && (
                <div
                    className={`mt-[1px] text-center text-[9px] ${
                        isForeign ? 'text-purple-500' : 'text-muted-foreground'
                    }`}
                >
                    {subLabel}
                </div>
            )}
        </div>
    )
}

const systemNodeTypes = {
    system: SystemNodeComponent,
}

// --- Main component
export function RegionMap({
    regionId,
    onBack,
    onSystemSelect,
}: {
    regionId: number
    onBack?: () => void
    onSystemSelect?: (system: RegionSystemNodeApi) => void
}) {
    const { data, isLoading, isError, error } = useRegionMap(regionId)
    const isDark = getIsDarkMode()

    const [editMode, setEditMode] = useState(false)
    //const queryClient = useQueryClient()

    const layoutMutation = useMutation({
        mutationFn: (vars: UpdateRegionLayoutPayload) => updateRegionLayoutApi(regionId, vars),
        retry: false,
        /*onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['region-universe', regionId],
            })
        },*/
    })

    // ReactFlow-Node-State
    const [rfNodes, setRfNodes] = useState<SystemNode[]>([])

    // Helper: Nodes aus API-Daten bauen
    const buildNodesFromData = useCallback((d: RegionMapApiResponse | undefined): SystemNode[] => {
        if (!d || d.systems.length === 0) return []

        const hasLayout = d.systems.some((s) => s.layoutX != null && s.layoutY != null)

        if (hasLayout) {
            return d.systems.map((s) => {
                const x = s.layoutX ?? 0
                const y = s.layoutY ?? 0
                const subLabel = s.isForeign ? s.regionName : `C${s.constellationId}`

                return {
                    id: s.id.toString(),
                    position: { x, y },
                    basePosition: { x, y },
                    type: 'system',
                    data: {
                        label: s.name,
                        subLabel,
                        isForeign: s.isForeign,
                    },
                    style: {
                        borderRadius: '0.25rem',
                        border: '1px solid rgba(0,0,0,0.2)',
                        padding: 0,
                        backgroundColor: 'var(--background)',
                    },
                }
            })
        }

        // Fallback: Autolayout aus SDE-Koordinaten
        const projected = d.systems.map((s) => ({
            id: s.id,
            name: s.name,
            x2d: s.x,
            y2d: -s.z,
            constellationId: s.constellationId,
            regionName: s.regionName,
            isForeign: s.isForeign,
        }))

        const xs = projected.map((p) => p.x2d)
        const ys = projected.map((p) => p.y2d)

        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const rangeX = maxX - minX || 1
        const rangeY = maxY - minY || 1

        const size = 1200
        const scale = size / Math.max(rangeX, rangeY)

        const baseNodes: SystemNode[] = projected.map((p) => {
            const x = (p.x2d - minX) * scale
            const y = (p.y2d - minY) * scale

            const subLabel = p.isForeign ? p.regionName : `C${p.constellationId}`

            return {
                id: p.id.toString(),
                position: { x, y },
                basePosition: { x, y },
                type: 'system',
                data: {
                    label: p.name,
                    subLabel,
                    isForeign: p.isForeign,
                },
                style: {
                    borderRadius: '0.25rem',
                    border: '1px solid rgba(0,0,0,0.2)',
                    padding: 0,
                    backgroundColor: 'var(--background)',
                },
            }
        })

        return relaxLayout(baseNodes)
    }, [])

    // Bei neuen Daten Nodes initial aufbauen
    useEffect(() => {
        if (!data) {
            setRfNodes([])
            return
        }
        const built = buildNodesFromData(data)
        setRfNodes(built)
    }, [data, buildNodesFromData])

    const edges: FlowEdge[] = useMemo(() => {
        if (!data) return []

        const nodeIdSet = new Set(rfNodes.map((n) => n.id))

        return (
            data.edges
                .filter((e) => {
                    const s = e.fromSystemId.toString()
                    const t = e.toSystemId.toString()
                    return nodeIdSet.has(s) && nodeIdSet.has(t)
                })
                .map((e) => ({
                    id: `${e.fromSystemId}-${e.toSystemId}`,
                    source: e.fromSystemId.toString(),
                    target: e.toSystemId.toString(),
                    type: 'straight',
                    selectable: false,
                    focused: false,
                    interactionWidth: 0,
                    animated: false,
                    style: {
                        stroke: getEdgeColor(e.borderType, isDark),
                        strokeWidth: 1.2,
                        opacity: 0.7,
                        pointerEvents: 'none',
                    },
                })) ?? []
        )
    }, [data, rfNodes, isDark])

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        setRfNodes((nds) => applyNodeChanges(changes, nds) as SystemNode[])
    }, [])

    const handleNodeDragStop = useCallback(
        (_: unknown, node: FlowNode) => {
            if (!editMode) return
            if (!node.id) return

            layoutMutation.mutate({
                systemId: Number(node.id),
                x: node.position.x,
                y: node.position.y,
            })
        },
        [editMode, layoutMutation],
    )

    const proOptions = { hideAttribution: true }

    if (isLoading) {
        return (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Loading systems…
            </div>
        )
    }

    if (isError) {
        const err = error as Error
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-500">
                <span>Failed to load region map.</span>
                <span className="text-muted-foreground text-xs">
                    {err?.message ?? 'Unknown error'}
                </span>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                <div className="flex flex-col">
                    <span className="font-semibold">{data?.region.name}</span>
                    {data?.region.faction && (
                        <span className="text-muted-foreground">{data.region.faction.name}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setEditMode((v) => !v)}
                        className={`rounded-sm border px-2 py-1 text-[11px] ${
                            editMode
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent'
                        }`}
                    >
                        {editMode ? 'Editing… (drag to save)' : 'Edit layout'}
                    </button>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="text-muted-foreground hover:bg-accent rounded-sm border px-2 py-1 text-[11px]"
                        >
                            ← Back to universe
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1">
                <ReactFlow
                    nodes={rfNodes}
                    edges={edges}
                    nodeTypes={systemNodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.08 }}
                    proOptions={proOptions}
                    nodeOrigin={[0.5, 0.5]}
                    className="h-full w-full"
                    minZoom={0.4}
                    maxZoom={2}
                    panOnDrag={editMode ? [2] : true}
                    zoomOnScroll
                    zoomOnPinch
                    zoomOnDoubleClick={false}
                    nodesDraggable={editMode}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    snapToGrid={editMode}
                    snapGrid={[25, 25]}
                    onNodesChange={handleNodesChange}
                    onNodeDragStop={handleNodeDragStop}
                    onNodeClick={(_, node) => {
                        if (!data) return
                        if (editMode) return
                        const sys = data.systems.find((s) => s.id === Number(node.id))
                        if (sys && onSystemSelect) {
                            onSystemSelect(sys)
                        }
                    }}
                >
                    <Background gap={25} size={1} />
                </ReactFlow>
            </div>
        </div>
    )
}
