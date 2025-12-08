-- CreateTable
CREATE TABLE "sde"."AsteroidBelt" (
    "id" INTEGER NOT NULL,
    "celestialIndex" INTEGER NOT NULL,
    "orbitId" INTEGER NOT NULL,
    "orbitIndex" INTEGER NOT NULL,
    "solarSystemId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "radius" INTEGER,
    "name" TEXT,
    "density" DOUBLE PRECISION,
    "eccentricity" DOUBLE PRECISION,
    "escapeVelocity" DOUBLE PRECISION,
    "locked" BOOLEAN,
    "massDust" DOUBLE PRECISION,
    "massGas" DOUBLE PRECISION,
    "orbitPeriod" DOUBLE PRECISION,
    "orbitRadius" BIGINT,
    "rotationRate" DOUBLE PRECISION,
    "spectralClass" TEXT,
    "surfaceGravity" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AsteroidBelt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Type" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupId" INTEGER,
    "metaGroupId" INTEGER,
    "marketGroupId" INTEGER,
    "iconId" INTEGER,
    "graphicId" INTEGER,
    "capacity" DOUBLE PRECISION,
    "mass" DOUBLE PRECISION,
    "basePrice" DOUBLE PRECISION,
    "published" BOOLEAN,
    "radius" DOUBLE PRECISION,
    "portionSize" INTEGER,
    "volume" DOUBLE PRECISION,
    "raceId" INTEGER,
    "variationParentTypeId" INTEGER,

    CONSTRAINT "Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Star" (
    "id" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "solarSystemId" INTEGER NOT NULL,
    "age" BIGINT NOT NULL,
    "life" BIGINT NOT NULL,
    "luminosity" DOUBLE PRECISION NOT NULL,
    "spectralClass" TEXT NOT NULL,
    "temperature" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,

    CONSTRAINT "Star_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sde"."AsteroidBelt" ADD CONSTRAINT "AsteroidBelt_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."AsteroidBelt" ADD CONSTRAINT "AsteroidBelt_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "sde"."Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Star" ADD CONSTRAINT "Star_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Star" ADD CONSTRAINT "Star_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "sde"."Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
