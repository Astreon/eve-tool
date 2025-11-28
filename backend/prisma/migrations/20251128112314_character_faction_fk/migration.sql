-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
