-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "data";

-- CreateTable
CREATE TABLE "data"."SystemActivitySample" (
    "id" SERIAL NOT NULL,
    "systemId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "jumps" INTEGER NOT NULL,
    "npcKills" INTEGER NOT NULL,
    "shipKills" INTEGER NOT NULL,
    "podKills" INTEGER NOT NULL,

    CONSTRAINT "SystemActivitySample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemActivitySample_systemId_timestamp_idx" ON "data"."SystemActivitySample"("systemId", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SystemActivitySample_systemId_timestamp_key" ON "data"."SystemActivitySample"("systemId", "timestamp");

-- AddForeignKey
ALTER TABLE "data"."SystemActivitySample" ADD CONSTRAINT "SystemActivitySample_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
