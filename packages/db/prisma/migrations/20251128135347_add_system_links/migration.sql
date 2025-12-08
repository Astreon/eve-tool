-- CreateTable
CREATE TABLE "public"."SystemLink" (
    "id" SERIAL NOT NULL,
    "fromSystemId" INTEGER NOT NULL,
    "toSystemId" INTEGER NOT NULL,

    CONSTRAINT "SystemLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemLink_fromSystemId_toSystemId_key" ON "public"."SystemLink"("fromSystemId", "toSystemId");

-- AddForeignKey
ALTER TABLE "public"."SystemLink" ADD CONSTRAINT "SystemLink_fromSystemId_fkey" FOREIGN KEY ("fromSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SystemLink" ADD CONSTRAINT "SystemLink_toSystemId_fkey" FOREIGN KEY ("toSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
