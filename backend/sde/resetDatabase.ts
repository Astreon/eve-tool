import {prisma} from "../src/lib/prisma";

export async function purgeSdeTables() {
    await prisma.$transaction(async (trx) => {
        await trx.bloodline.deleteMany({})
        await trx.constellation.deleteMany({})
        await trx.faction.deleteMany({})
        await trx.race.deleteMany({})
        await trx.region.deleteMany({})
        await trx.solarSystem.deleteMany({})
    })
}