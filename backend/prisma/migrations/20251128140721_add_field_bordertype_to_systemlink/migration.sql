-- CreateEnum
CREATE TYPE "public"."SystemBorderType" AS ENUM ('INTERNAL', 'CONSTELLATION', 'REGION');

-- AlterTable
ALTER TABLE "public"."SystemLink" ADD COLUMN     "borderType" "public"."SystemBorderType" NOT NULL DEFAULT 'INTERNAL';
