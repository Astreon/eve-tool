-- CreateTable
CREATE TABLE "sde"."NpcStation" (
    "id" INTEGER NOT NULL,
    "celestialIndex" INTEGER NOT NULL,
    "operationId" INTEGER NOT NULL,
    "orbitId" INTEGER NOT NULL,
    "orbitIndex" INTEGER,
    "npcCorporationId" INTEGER NOT NULL,
    "solarSystemId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "reprocessingEfficiency" DOUBLE PRECISION NOT NULL,
    "reprocessingHangarFlag" INTEGER NOT NULL,
    "reprocessingStationsTake" DOUBLE PRECISION NOT NULL,
    "useOperationName" BOOLEAN NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NpcStation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sde"."NpcStation" ADD CONSTRAINT "NpcStation_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "sde"."Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
