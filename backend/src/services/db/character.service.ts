import {prisma} from "../../lib/prisma.js";

export const getCharacterFromDb = async (characterId: number) => {
    return prisma.character.findUnique({
        where: {id: characterId},
    })
}