-- CreateTable
CREATE TABLE "public"."ConstellationLink" (
    "id" SERIAL NOT NULL,
    "fromConstellationId" INTEGER NOT NULL,
    "toConstellationId" INTEGER NOT NULL,

    CONSTRAINT "ConstellationLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConstellationLink_fromConstellationId_toConstellationId_key" ON "public"."ConstellationLink"("fromConstellationId", "toConstellationId");

-- AddForeignKey
ALTER TABLE "public"."ConstellationLink" ADD CONSTRAINT "ConstellationLink_fromConstellationId_fkey" FOREIGN KEY ("fromConstellationId") REFERENCES "sde"."Constellation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConstellationLink" ADD CONSTRAINT "ConstellationLink_toConstellationId_fkey" FOREIGN KEY ("toConstellationId") REFERENCES "sde"."Constellation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
