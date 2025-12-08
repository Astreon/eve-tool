-- CreateTable
CREATE TABLE "sde"."VersionDataset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersionDataset_pkey" PRIMARY KEY ("id")
);
