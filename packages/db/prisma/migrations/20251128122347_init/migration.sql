-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sde";

-- CreateTable
CREATE TABLE "public"."Character" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "bloodlineId" INTEGER NOT NULL,
    "corporationId" INTEGER NOT NULL,
    "allianceId" INTEGER,
    "raceId" INTEGER NOT NULL,
    "factionId" INTEGER,
    "securityStatus" DOUBLE PRECISION,
    "gender" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "etag" TEXT,
    "lastModified" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "characterName" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "refreshToken" TEXT,
    "lastLoginAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegionLink" (
    "id" SERIAL NOT NULL,
    "fromRegionId" INTEGER NOT NULL,
    "toRegionId" INTEGER NOT NULL,

    CONSTRAINT "RegionLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Version" (
    "key" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sde"."Bloodline" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Bloodline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Race" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Faction" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "corporationId" INTEGER,
    "solarSystemId" INTEGER NOT NULL,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."SolarSystem" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "securityStatus" DOUBLE PRECISION NOT NULL,
    "constellationId" INTEGER NOT NULL,
    "regionId" INTEGER NOT NULL,
    "factionId" INTEGER,
    "starId" INTEGER,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SolarSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Constellation" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "factionId" INTEGER,
    "regionId" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Constellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Region" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "factionId" INTEGER,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Stargate" (
    "id" INTEGER NOT NULL,
    "solarSystemId" INTEGER NOT NULL,
    "destSolarSystemId" INTEGER NOT NULL,
    "destStargateId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Stargate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Planet" (
    "id" INTEGER NOT NULL,
    "solarSystemId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "celestialIndex" INTEGER NOT NULL,
    "orbitId" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "eccentricity" DOUBLE PRECISION NOT NULL,
    "escapeVelocity" DOUBLE PRECISION NOT NULL,
    "locked" BOOLEAN NOT NULL,
    "massDust" DOUBLE PRECISION,
    "massGas" DOUBLE PRECISION,
    "orbitPeriod" DOUBLE PRECISION,
    "orbitRadius" BIGINT,
    "pressure" DOUBLE PRECISION NOT NULL,
    "rotationRate" DOUBLE PRECISION NOT NULL,
    "spectralClass" TEXT NOT NULL,
    "surfaceGravity" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."Moon" (
    "id" INTEGER NOT NULL,
    "solarSystemId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "celestialIndex" INTEGER NOT NULL,
    "orbitId" INTEGER NOT NULL,
    "orbitIndex" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "density" DOUBLE PRECISION,
    "eccentricity" DOUBLE PRECISION,
    "escapeVelocity" DOUBLE PRECISION,
    "locked" BOOLEAN,
    "massDust" DOUBLE PRECISION,
    "massGas" DOUBLE PRECISION,
    "orbitPeriod" DOUBLE PRECISION,
    "orbitRadius" BIGINT,
    "pressure" DOUBLE PRECISION,
    "rotationRate" DOUBLE PRECISION,
    "spectralClass" TEXT,
    "surfaceGravity" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Moon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_key" ON "public"."Character"("name");

-- CreateIndex
CREATE INDEX "Character_expiresAt_idx" ON "public"."Character"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_characterId_key" ON "public"."User"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionLink_fromRegionId_toRegionId_key" ON "public"."RegionLink"("fromRegionId", "toRegionId");

-- CreateIndex
CREATE UNIQUE INDEX "Version_buildNumber_key" ON "sde"."Version"("buildNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bloodline_name_key" ON "sde"."Bloodline"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Race_name_key" ON "sde"."Race"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_name_key" ON "sde"."Faction"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SolarSystem_name_key" ON "sde"."SolarSystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Constellation_name_key" ON "sde"."Constellation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "sde"."Region"("name");

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_bloodlineId_fkey" FOREIGN KEY ("bloodlineId") REFERENCES "sde"."Bloodline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "sde"."Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "sde"."Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegionLink" ADD CONSTRAINT "RegionLink_fromRegionId_fkey" FOREIGN KEY ("fromRegionId") REFERENCES "sde"."Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegionLink" ADD CONSTRAINT "RegionLink_toRegionId_fkey" FOREIGN KEY ("toRegionId") REFERENCES "sde"."Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."SolarSystem" ADD CONSTRAINT "SolarSystem_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "sde"."Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."SolarSystem" ADD CONSTRAINT "SolarSystem_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "sde"."Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."SolarSystem" ADD CONSTRAINT "SolarSystem_constellationId_fkey" FOREIGN KEY ("constellationId") REFERENCES "sde"."Constellation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Constellation" ADD CONSTRAINT "Constellation_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "sde"."Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Constellation" ADD CONSTRAINT "Constellation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "sde"."Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Region" ADD CONSTRAINT "Region_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "sde"."Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Stargate" ADD CONSTRAINT "Stargate_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Planet" ADD CONSTRAINT "Planet_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sde"."Moon" ADD CONSTRAINT "Moon_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
