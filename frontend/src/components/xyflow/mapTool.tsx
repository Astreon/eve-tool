/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useState } from 'react'
import { UniverseMap } from '@/components/xyflow/universeMap.tsx'
import { RegionMap } from '@/components/xyflow/regionMap.tsx'

type ViewMode = 'universe' | 'region'

type SelectedSystem = {
    id: number
    name: string
    constellationId: number
}

export function MapTool() {
    const [mode, setMode] = useState<ViewMode>('universe')
    const [activeRegionId, setActiveRegionId] = useState<number | null>(null)
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null)
    const [selectedSystem, setSelectedSystem] = useState<SelectedSystem | null>(null)

    return (
        <div className="grid h-full grid-cols-[minmax(0,5fr)_minmax(0,1.4fr)] gap-4">
            {/* Linke Seite: Canvas */}
            <div className="border-border overflow-hidden rounded-lg border">
                {mode === 'universe' && (
                    <UniverseMap
                        onRegionClick={(id) => {
                            setSelectedRegionId(id)
                            setSelectedSystem(null)
                        }}
                        onRegionDoubleClick={(id) => {
                            setActiveRegionId(id)
                            setSelectedRegionId(id)
                            setSelectedSystem(null)
                            setMode('region')
                        }}
                    />
                )}

                {mode === 'region' && activeRegionId !== null && (
                    <RegionMap
                        regionId={activeRegionId}
                        onBack={() => {
                            setMode('universe')
                            setSelectedSystem(null)
                        }}
                        onSystemSelect={(system) => {
                            setSelectedSystem({
                                id: system.id,
                                name: system.name,
                                constellationId: system.constellationId,
                            })
                        }}
                    />
                )}
            </div>

            {/* Rechte Seite: Info-Panel */}
            <div className="border-border flex flex-col gap-3 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {mode === 'universe' ? 'Universe overview' : 'Region details'}
                    </div>
                    {mode === 'region' && activeRegionId !== null && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('universe')
                                setSelectedSystem(null)
                            }}
                            className="text-muted-foreground hover:bg-accent rounded-sm border px-2 py-1 text-[11px]"
                        >
                            ← Back to universe
                        </button>
                    )}
                </div>

                {mode === 'universe' && (
                    <div className="space-y-2 text-xs">
                        {!selectedRegionId && (
                            <p className="text-muted-foreground">
                                Klicke eine Region im Universum an, um sie im Infofenster zu
                                markieren.
                                <br />
                                Doppelklick öffnet die Regionskarte.
                            </p>
                        )}

                        {selectedRegionId && (
                            <div className="space-y-1">
                                <div>
                                    <span className="font-medium">Ausgewählte Region:</span>{' '}
                                    <span className="font-mono">{selectedRegionId}</span>
                                </div>
                                <p className="text-muted-foreground">
                                    Doppelklicke die Region im Canvas, um in die Systemansicht zu
                                    wechseln.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'region' && activeRegionId !== null && (
                    <div className="space-y-3 text-xs">
                        <div>
                            <div className="font-medium">
                                Region <span className="font-mono">{activeRegionId}</span>
                            </div>
                            <p className="text-muted-foreground">
                                Du befindest dich in der Systemansicht dieser Region. Kantenfarbe:
                            </p>
                            <ul className="text-muted-foreground mt-1 list-inside list-disc">
                                <li>
                                    Schwarz/Weiss: Verbindung innerhalb der gleichen Constellation
                                </li>
                                <li>Rot: Verbindung zu System in anderer Constellation</li>
                                <li>Violett: Verbindung zu System in anderer Region</li>
                            </ul>
                        </div>

                        {selectedSystem ? (
                            <div className="space-y-1">
                                <div className="font-medium">Ausgewähltes System</div>
                                <div>
                                    Name: <span className="font-mono">{selectedSystem.name}</span>
                                </div>
                                <div>
                                    ID: <span className="font-mono">{selectedSystem.id}</span>
                                </div>
                                <div>
                                    Constellation:{' '}
                                    <span className="font-mono">
                                        {selectedSystem.constellationId}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                Klicke ein System im Canvas an, um Details hier anzuzeigen.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
