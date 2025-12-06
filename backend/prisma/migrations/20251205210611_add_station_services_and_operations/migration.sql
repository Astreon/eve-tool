-- CreateTable
CREATE TABLE "sde"."StationService" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "StationService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sde"."StationOperation" (
    "id" INTEGER NOT NULL,
    "activityId" INTEGER NOT NULL,
    "border" DOUBLE PRECISION NOT NULL,
    "corridor" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fringe" DOUBLE PRECISION NOT NULL,
    "hub" DOUBLE PRECISION NOT NULL,
    "manufacturingFactor" DOUBLE PRECISION NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "researchFactor" DOUBLE PRECISION NOT NULL,
    "services" INTEGER[],

    CONSTRAINT "StationOperation_pkey" PRIMARY KEY ("id")
);
