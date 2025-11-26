/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from "path";
import * as readline from "readline";
import * as fs from "fs";
import { prisma } from "../../src/lib/prisma.js";
import { ImportResult } from "../importer.js";
import { BATCH_SIZE, SDE_DIR } from "../config";
import { Prisma } from "../../src/generated/client.js";

export const importMoons = async (dryRun = false): Promise<ImportResult> => {
    const filePath = path.join(SDE_DIR, "mapMoons.jsonl");
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing File: ${filePath}`);
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
    });

    const batch: Prisma.MoonCreateManyInput[] = [];
    let success = 0;
    let total = 0;
    let errors = 0;

    for await (const line of rl) {
        total++;
        try {
            const json = JSON.parse(line);
            const data: Prisma.MoonCreateManyInput = {
                id: json._key,
                solarSystemId: json.solarSystemID,
                typeId: json.typeID,
                celestialIndex: json.celestialIndex,
                orbitId: json.orbitID,
                orbitIndex: json.orbitIndex,
                radius: json.radius,
                density: json.statistics?.density ?? null,
                eccentricity: json.statistics?.eccentricity ?? null,
                escapeVelocity: json.statistics?.escapeVelocity ?? null,
                locked: json.statistics?.locked ?? null,
                massDust: json.statistics?.massDust ?? null,
                massGas: json.statistics?.massGas ?? null,
                orbitPeriod: json.statistics?.orbitPeriod ?? null,
                orbitRadius: json.statistics?.orbitRadius ?? null,
                pressure: json.statistics?.pressure ?? null,
                rotationRate: json.statistics?.rotationRate ?? null,
                spectralClass: json.statistics?.spectralClass ?? null,
                surfaceGravity: json.statistics?.surfaceGravity ?? null,
                temperature: json.statistics?.temperature ?? null,
                x: json.position.x,
                y: json.position.y,
                z: json.position.z,
            };
            batch.push(data);

            if (batch.length >= BATCH_SIZE) {
                if (!dryRun) {
                    await Promise.all(
                        batch.map((row) =>
                            prisma.moon.upsert({
                                where: { id: row.id },
                                create: row,
                                update: row,
                            }),
                        ),
                    );
                }
                success += batch.length;
                batch.length = 0;
            }
        } catch (err) {
            errors++;
            console.log(
                `❌ Parse/DB error @line ${total}:`,
                (err as Error).message,
            );
        }
    }

    if (batch.length > 0) {
        if (!dryRun) {
            await Promise.all(
                batch.map((row) =>
                    prisma.moon.upsert({
                        where: { id: row.id },
                        create: row,
                        update: row,
                    }),
                ),
            );
        }
        success += batch.length;
    }

    return { success, total, errors };
};
