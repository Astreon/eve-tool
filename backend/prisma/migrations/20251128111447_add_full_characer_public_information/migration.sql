/*
  Warnings:

  - Added the required column `birthday` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "allianceId" INTEGER,
ADD COLUMN     "birthday" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "factionId" INTEGER,
ADD COLUMN     "gender" TEXT NOT NULL,
ADD COLUMN     "title" TEXT;
