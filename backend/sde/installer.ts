/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { importer } from "./importer.js";
import {
    IMPORT_TASKS,
    IMPORT_TASKS_BY_ID,
    type ImportDatasetId,
} from "./tasks/importTasks.js";
import {
    CALCULATION_TASKS,
    CALCULATION_TASKS_BY_ID,
    type CalculationId,
} from "./tasks/calculateTasks.js";
import { assertSdeDirOnThrow } from "./config.js";
import { ensureLatestSdeOnDisk } from "./remote.js";
import {
    readSdeVersionFromFile,
    getDbVersion,
    upsertDbVersion,
    type SdeVersion,
} from "./version.js";
import { invalidateSdeCaches } from "./cache.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";

type Command =
    | "install"
    | "import"
    | "calculate"
    | "update"
    | "download"
    | "help";

interface GlobalOptions {
    dryRun: boolean;
    force: boolean;
    datasets?: string[];
}

interface ParsedArgs {
    command: Command;
    subcommand?: string;
    options: GlobalOptions;
}

// --- Argument Parsing
function parseArgs(argv: string[]): ParsedArgs {
    const positional: string[] = [];
    const options: GlobalOptions = {
        dryRun: false,
        force: false,
    };

    for (const arg of argv) {
        if (arg === "--dry-run") {
            options.dryRun = true;
            continue;
        }

        if (arg === "--force") {
            options.force = true;
            continue;
        }

        if (arg.startsWith("--datasets=")) {
            const value = arg.slice("--datasets=".length).trim();
            if (value.length) {
                options.datasets = value
                    .split(",")
                    .map((v) => v.trim().toLowerCase())
                    .filter((v) => v.length > 0);
            }
            continue;
        }

        if (arg === "--help" || arg === "-h") {
            return { command: "help", options };
        }

        if (arg.startsWith("-")) {
            console.warn(`⚠️  Unknown option: ${arg}`);
            continue;
        }

        positional.push(arg);
    }

    const first = (positional[0] ?? "help").toLowerCase();
    let command: Command;
    let subcommand: string | undefined = positional[1];

    switch (first) {
        case "install":
        case "import":
        case "calculate":
        case "update":
        case "download":
            command = first;
            break;
        case "help":
        default:
            command = "help";
            break;
    }

    if (command !== "calculate") {
        subcommand = undefined;
    }

    return { command, subcommand, options };
}

// --- Helpers
function printHelp(): void {
    const datasetList = IMPORT_TASKS.map((t) => t.id).join(", ");
    const calcList = CALCULATION_TASKS.map((t) => t.id).join(", ");

    console.log(
        `
            EVE Tool – SDE INSTALLER
            
            Usage:
              npm run sde:<command> -- [options]
            
            Commands:
              install                      Always run: download (if needed), import all datasets,
                                           run all calculations, invalidate Redis, update DB version.
            
              import                       Version-aware import of all datasets + Redis invalidation.
                                           Skips if no new SDE version (unless --force).
              import --datasets=regions    Version-aware import for specific datasets.
                                           Skips if no new SDE version (unless --force).
                                           Partial imports do not update DB version.
            
              calculate                    Version-aware run of all calculations + Redis invalidation.
              calculate region-links       Run only the given calculation.
                                           Skips if DB/File versions differ (unless --force).
            
              update                       Download .sde (if needed), check version; if mismatch:
                                           import all datasets + run all calculations +
                                           update DB version + invalidate Redis.
            
              download                     Only download/refresh .sde files (no DB writes, no Redis).
            
            Options:
              --dry-run                    No DB writes, no Redis invalidation, no download.
              --force                      Ignore version checks and always run for this command.
              --datasets=<list>            Comma-separated dataset list for "import".
              -h, --help                   Show this help.
            
            Datasets:
              ${datasetList}
            
            Calculations:
              ${calcList}
            `.trim(),
    );
}

function formatVersion(label: string, v: SdeVersion | null): string {
    if (!v) return `${label}: <none>`;
    return `${label}: build=${v.buildNumber}, release=${v.releaseDate.toISOString()}`;
}

// --- INSTALL – all, force everytime
async function runInstall(options: GlobalOptions): Promise<void> {
    const { dryRun } = options;

    console.log("🚀 EVE Tool – SDE INSTALL (force full pipeline)");
    if (dryRun) {
        console.log(
            "🧪 DRY-RUN: no download, no DB writes, no Redis invalidation.",
        );
    }

    if (!dryRun) {
        console.log("🌐 Ensuring latest SDE is available on disk…");
        await ensureLatestSdeOnDisk();
    } else {
        console.log("🌵 Dry-run: skipping download.");
    }

    assertSdeDirOnThrow();

    console.log("📄 Reading SDE version from file…");
    const fileVersion = await readSdeVersionFromFile();
    console.log(formatVersion("   File version", fileVersion));

    console.log("📥 Running full import of ALL datasets (force)…");
    const importStart = performance.now();
    const stats = await importer(dryRun);
    const importDuration = ((performance.now() - importStart) / 1000).toFixed(
        1,
    );
    console.log(
        `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
    );
    console.log(`✅ Import phase finished in ${importDuration}s.`);

    console.log("🧮 Running ALL calculations (force)…");
    const calcStart = performance.now();
    const calcStats = await runAllCalculations(dryRun);
    const calcDuration = ((performance.now() - calcStart) / 1000).toFixed(1);
    console.log(
        `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
    );
    console.log(`✅ Calculation phase finished in ${calcDuration}s.`);

    if (dryRun) {
        console.log(
            "🌵 Dry-run: skipping DB version update and Redis invalidation.",
        );
        return;
    }

    console.log("📝 Updating SDE version in database…");
    await upsertDbVersion(fileVersion);
    console.log(
        `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
    );

    console.log("🧹 Invalidating Redis caches related to SDE/universe…");
    await invalidateSdeCaches();
    console.log("✅ Redis caches successfully invalidated.");
}

// --- IMPORT – version-aware
async function runImportCommand(options: GlobalOptions): Promise<void> {
    const { dryRun, force, datasets } = options;

    assertSdeDirOnThrow();

    console.log("🚀 EVE Tool – SDE IMPORT (version-aware)");
    if (dryRun) {
        console.log("🧪 DRY-RUN: no DB writes, no Redis invalidation.");
    }

    const fileVersion = await readSdeVersionFromFile();
    const dbVersion = await getDbVersion();
    console.log(formatVersion("   DB version", dbVersion));
    console.log(formatVersion("   File version", fileVersion));

    const versionMatches =
        dbVersion && dbVersion.buildNumber === fileVersion.buildNumber;

    if (!datasets || datasets.length === 0) {
        // Full Import
        if (versionMatches && !force) {
            console.log(
                "🆗 SDE already up to date and --force not set. Nothing to import.",
            );
            return;
        }

        console.log(
            force
                ? "⬆️ Running FULL import with --force (ignoring version match)…"
                : "⬆️ Running FULL import because file version differs…",
        );

        const start = performance.now();
        const stats = await importer(dryRun);
        const dur = ((performance.now() - start) / 1000).toFixed(1);

        console.log(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        );
        console.log(`✅ Full import finished in ${dur}s.`);

        if (dryRun) {
            console.log(
                "🌵 Dry-run: skipping DB version update and Redis invalidation.",
            );
            return;
        }

        console.log("📝 Updating SDE version in database…");
        await upsertDbVersion(fileVersion);
        console.log(
            `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
        );

        console.log("🧹 Invalidating Redis caches related to SDE/universe…");
        await invalidateSdeCaches();
        console.log("✅ Redis caches successfully invalidated.");
        return;
    }

    // --- Partial Import (selected datasets)
    const ids: ImportDatasetId[] = [];

    for (const name of datasets) {
        if (name in IMPORT_TASKS_BY_ID) {
            ids.push(name as ImportDatasetId);
        } else {
            console.warn(`⚠️  Unknown dataset "${name}" – skipping`);
        }
    }

    if (ids.length === 0) {
        console.error("❌ No valid datasets specified for import.");
        process.exitCode = 1;
        return;
    }

    if (versionMatches && !force) {
        console.log(
            "🆗 SDE already up to date and --force not set. Skipping partial import.",
        );
        return;
    }

    console.log(
        `⬆️ Running PARTIAL import for datasets: ${ids.join(", ")}${
            force ? " (forced)" : ""
        }`,
    );

    const start = performance.now();
    let datasetSuccess = 0;
    let lineTotal = 0;
    let lineSuccess = 0;
    let errorCount = 0;

    for (const id of ids) {
        const task = IMPORT_TASKS_BY_ID[id];
        console.log(`📦 Importing ${task.label}…`);
        const dsStart = performance.now();

        try {
            const { success, total, errors } = await task.run(dryRun);
            datasetSuccess++;
            lineTotal += total;
            lineSuccess += success;
            errorCount += errors;

            const dur = ((performance.now() - dsStart) / 1000).toFixed(1);
            console.log(
                `✅ Imported ${success}/${total} ${task.label} in ${dur}s (${errors} errors)`,
            );
        } catch (err) {
            errorCount++;
            const dur = ((performance.now() - dsStart) / 1000).toFixed(1);
            console.error(
                `❌ Failed to import ${task.label} after ${dur}s:`,
                (err as Error).message,
            );
        }
    }

    const totalDur = ((performance.now() - start) / 1000).toFixed(1);
    console.log(
        `📊 Summary: ${lineSuccess}/${lineTotal} lines across ${datasetSuccess}/${ids.length} datasets in ${totalDur}s (${errorCount} total errors)`,
    );

    if (dryRun) {
        console.log(
            "🌵 Dry-run: skipping DB version update and Redis invalidation.",
        );
        return;
    }

    // Important: DB-Version if PARTIAL IMPORT => NO update
    console.log(
        "ℹ️ Partial import completed. DB SDE version was not changed (only full import updates version).",
    );

    console.log("🧹 Invalidating Redis caches related to SDE/universe…");
    await invalidateSdeCaches();
    console.log("✅ Redis caches successfully invalidated.");
}

// --- CALCULATE – version-aware
interface CalculationStats {
    taskTotal: number;
    taskSuccess: number;
    errorCount: number;
}

async function runAllCalculations(dryRun: boolean): Promise<CalculationStats> {
    const stats: CalculationStats = {
        taskTotal: CALCULATION_TASKS.length,
        taskSuccess: 0,
        errorCount: 0,
    };

    for (const task of CALCULATION_TASKS) {
        console.log(`🧮 Running calculation: ${task.label}…`);
        const start = performance.now();

        try {
            await task.run(dryRun);
            stats.taskSuccess++;

            const dur = ((performance.now() - start) / 1000).toFixed(1);
            console.log(`✅ Calculation ${task.label} finished in ${dur}s.`);
        } catch (err) {
            stats.errorCount++;
            const dur = ((performance.now() - start) / 1000).toFixed(1);
            console.error(
                `❌ Calculation ${task.label} failed after ${dur}s:`,
                (err as Error).message,
            );
        }
    }

    return stats;
}

async function runCalculationsSelected(
    ids: CalculationId[],
    dryRun: boolean,
): Promise<CalculationStats> {
    const stats: CalculationStats = {
        taskTotal: ids.length,
        taskSuccess: 0,
        errorCount: 0,
    };

    for (const id of ids) {
        const task = CALCULATION_TASKS_BY_ID[id];
        console.log(`🧮 Running calculation: ${task.label}…`);
        const start = performance.now();

        try {
            await task.run(dryRun);
            stats.taskSuccess++;

            const dur = ((performance.now() - start) / 1000).toFixed(1);
            console.log(`✅ Calculation ${task.label} finished in ${dur}s.`);
        } catch (err) {
            stats.errorCount++;
            const dur = ((performance.now() - start) / 1000).toFixed(1);
            console.error(
                `❌ Calculation ${task.label} failed after ${dur}s:`,
                (err as Error).message,
            );
        }
    }

    return stats;
}

async function runCalculateCommand(
    subcommand: string | undefined,
    options: GlobalOptions,
): Promise<void> {
    const { dryRun, force } = options;

    assertSdeDirOnThrow();

    console.log("🚀 EVE Tool – SDE CALCULATE (version-aware)");

    const fileVersion = await readSdeVersionFromFile();
    const dbVersion = await getDbVersion();
    console.log(formatVersion("   DB version", dbVersion));
    console.log(formatVersion("   File version", fileVersion));

    if (!dbVersion) {
        console.log(
            "ℹ️ No SDE version in DB found. Nothing to calculate (run import/update first).",
        );
        return;
    }

    const versionMatches = dbVersion.buildNumber === fileVersion.buildNumber;

    if (!versionMatches && !force) {
        console.log(
            "⚠️ DB and file SDE versions differ. Run `sde:update` or `sde:install`, or use --force to calculate anyway.",
        );
        return;
    }

    if (dryRun) {
        console.log(
            "🧪 DRY-RUN: calculations will not write to DB or invalidate Redis.",
        );
    }

    if (!subcommand) {
        const stats = await runAllCalculations(dryRun);
        console.log(
            `📊 Calculations summary: ${stats.taskSuccess}/${stats.taskTotal} tasks (${stats.errorCount} errors)`,
        );
    } else {
        const id = subcommand.toLowerCase() as CalculationId;
        if (!(id in CALCULATION_TASKS_BY_ID)) {
            console.error(`❌ Unknown calculation "${subcommand}".`);
            process.exitCode = 1;
            return;
        }

        const stats = await runCalculationsSelected([id], dryRun);
        console.log(
            `📊 Calculations summary: ${stats.taskSuccess}/${stats.taskTotal} tasks (${stats.errorCount} errors)`,
        );
    }

    if (dryRun) {
        console.log("🌵 Dry-run: skipping Redis invalidation.");
        return;
    }

    console.log("🧹 Invalidating Redis caches related to SDE/universe…");
    await invalidateSdeCaches();
    console.log("✅ Redis caches successfully invalidated.");
}

// --- UPDATE – import and calculate if Version mismatch
async function runUpdateCommand(options: GlobalOptions): Promise<void> {
    const { dryRun, force } = options;

    console.log(
        "🚀 EVE Tool – SDE UPDATE (import + calculate on version change)",
    );
    if (dryRun) {
        console.log(
            "🧪 DRY-RUN: no download, no DB writes, no Redis invalidation.",
        );
    }

    if (!dryRun) {
        console.log("🌐 Ensuring latest SDE is available on disk…");
        await ensureLatestSdeOnDisk();
    } else {
        console.log("🌵 Dry-run: skipping download.");
    }

    assertSdeDirOnThrow();

    const fileVersion = await readSdeVersionFromFile();
    const dbVersion = await getDbVersion();
    console.log(formatVersion("   DB version", dbVersion));
    console.log(formatVersion("   File version", fileVersion));

    const versionMatches =
        dbVersion && dbVersion.buildNumber === fileVersion.buildNumber;

    if (versionMatches && !force) {
        console.log(
            "🆗 SDE already up to date and --force not set. Nothing to update.",
        );
        return;
    }

    console.log(
        force
            ? "⬆️ Running UPDATE pipeline with --force (import + calculate)…"
            : "⬆️ New SDE version detected – running UPDATE pipeline (import + calculate)…",
    );

    // Import
    const importStart = performance.now();
    const stats = await importer(dryRun);
    const importDur = ((performance.now() - importStart) / 1000).toFixed(1);
    console.log(
        `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
    );
    console.log(`✅ Import phase finished in ${importDur}s.`);

    // --- Calculations
    const calcStart = performance.now();
    const calcStats = await runAllCalculations(dryRun);
    const calcDur = ((performance.now() - calcStart) / 1000).toFixed(1);
    console.log(
        `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
    );
    console.log(`✅ Calculation phase finished in ${calcDur}s.`);

    if (dryRun) {
        console.log(
            "🌵 Dry-run: skipping DB version update and Redis invalidation.",
        );
        return;
    }

    console.log("📝 Updating SDE version in database…");
    await upsertDbVersion(fileVersion);
    console.log(
        `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
    );

    console.log("🧹 Invalidating Redis caches related to SDE/universe…");
    await invalidateSdeCaches();
    console.log("✅ Redis caches successfully invalidated.");
}

// --- DOWNLOAD – only .sde Files
async function runDownloadCommand(options: GlobalOptions): Promise<void> {
    const { dryRun } = options;

    console.log("🚀 EVE Tool – SDE DOWNLOAD (.sde only)");
    if (dryRun) {
        console.log("🧪 DRY-RUN: skipping download.");
        return;
    }

    await ensureLatestSdeOnDisk();
    console.log("✅ SDE files are up to date on disk.");
}

// --- Main
(async () => {
    const { command, subcommand, options } = parseArgs(process.argv.slice(2));

    if (command === "help") {
        printHelp();
        return;
    }

    try {
        if (command === "install") {
            await runInstall(options);
            return;
        }

        if (command === "import") {
            await runImportCommand(options);
            return;
        }

        if (command === "calculate") {
            await runCalculateCommand(subcommand, options);
            return;
        }

        if (command === "update") {
            await runUpdateCommand(options);
            return;
        }

        if (command === "download") {
            await runDownloadCommand(options);
            return;
        }

        printHelp();
        process.exitCode = 1;
    } catch (err) {
        console.error("❌ SDE Installer failed:", err);
        process.exitCode = 1;
    } finally {
        try {
            await prisma.$disconnect();
        } catch {
            // ignore
        }

        try {
            await redis.quit();
        } catch {
            // ignore
        }
    }
})();
