/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { prisma } from "../../lib/prisma.js";

export const getCharacterFromDb = async (characterId: number) => {
    return prisma.character.findUnique({
        where: { id: characterId },
    });
};
