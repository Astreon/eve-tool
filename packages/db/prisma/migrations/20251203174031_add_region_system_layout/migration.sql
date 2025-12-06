-- CreateTable
CREATE TABLE "RegionSystemLayout" (
    "mapRegionId" INTEGER NOT NULL,
    "systemId" INTEGER NOT NULL,
    "layoutMode" TEXT NOT NULL DEFAULT 'optimized',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionSystemLayout_pkey" PRIMARY KEY ("mapRegionId","systemId","layoutMode")
);

-- CreateIndex
CREATE INDEX "RegionSystemLayout_systemId_layoutMode_idx" ON "RegionSystemLayout"("systemId", "layoutMode");

-- AddForeignKey
ALTER TABLE "RegionSystemLayout" ADD CONSTRAINT "RegionSystemLayout_mapRegionId_fkey" FOREIGN KEY ("mapRegionId") REFERENCES "sde"."Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionSystemLayout" ADD CONSTRAINT "RegionSystemLayout_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
