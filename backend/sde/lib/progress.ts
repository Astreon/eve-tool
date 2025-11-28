/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

interface ProgressOptions {
    label?: string
    total?: number
    redrawEvery?: number
}

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
}

export function createProgressBar(options: ProgressOptions = {}) {
    const start = Date.now()
    let current = 0
    let total = options.total
    const label = options.label ?? ''
    const redrawEvery = options.redrawEvery ?? 1_000
    const isTty = process.stdout.isTTY
    let lastLineLength = 0
    let lastRender = 0

    function buildLine(): string {
        const now = Date.now()
        const elapsedMs = now - start
        const elapsedStr = formatDuration(elapsedMs)
        const rate = elapsedMs > 0 ? current / (elapsedMs / 1000) : 0

        let bar = ''
        let percentStr = ''
        if (typeof total === 'number' && total > 0) {
            const width = 20
            const ratio = Math.max(0, Math.min(1, current / total))
            const filled = Math.round(width * ratio)
            const empty = width - filled
            bar = `[${'#'.repeat(filled)}${'.'.repeat(empty)}]`
            percentStr = `${(ratio * 100).toFixed(1)}%`
        }

        const parts: string[] = []
        if (label) parts.push(label)
        if (bar) parts.push(bar)

        const countPart =
            typeof total === 'number' && total > 0
                ? `${current}/${total} records`
                : `${current} records`

        parts.push(countPart)

        if (percentStr) parts.push(percentStr)
        if (rate > 0) parts.push(`${rate.toFixed(0)}/s`)
        parts.push(elapsedStr)

        return parts.join('  ')
    }

    function render() {
        if (!isTty) return
        const line = buildLine()
        const padding = Math.max(0, lastLineLength - line.length)
        process.stdout.write(`\r${line}${' '.repeat(padding)}`)
        lastLineLength = line.length
    }

    return {
        tick(delta = 1) {
            current += delta

            if (!isTty) {
                return
            }

            const now = Date.now()
            if (current === delta || now - lastRender >= redrawEvery) {
                lastRender = now
                render()
            }
        },

        setTotal(newTotal: number) {
            total = newTotal
        },

        done(options: { clear?: boolean } = {}) {
            const { clear = true } = options

            if (!isTty) {
                // in nicht-TTY-Umgebung am Ende eine Zeile schreiben
                const line = buildLine()
                if (!clear) {
                    // nur in dem Fall überhaupt loggen
                    console.log(line)
                }
                return
            }

            render()

            if (clear) {
                const blank = ' '.repeat(lastLineLength)
                process.stdout.write(`\r${blank}\r`)
                lastLineLength = 0
            } else {
                process.stdout.write('\n')
            }
        },
    }
}
