/*
  Warnings:

  - A unique constraint covering the columns `[solarSystemId]` on the table `Star` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Star_solarSystemId_key" ON "sde"."Star"("solarSystemId");
