/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Character } from "../../generated/client.js";

export type CharacterWithRelations = Character & {
    race: { name: string };
    bloodline: { name: string };
};
