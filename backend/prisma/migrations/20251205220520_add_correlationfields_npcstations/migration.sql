-- AddForeignKey
ALTER TABLE "sde"."NpcStation" ADD CONSTRAINT "NpcStation_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "sde"."SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
