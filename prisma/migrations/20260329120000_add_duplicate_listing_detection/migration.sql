-- AlterTable: add duplicateOfId for duplicate listing detection
ALTER TABLE "Listing" ADD COLUMN "duplicateOfId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_duplicateOfId_idx" ON "Listing"("duplicateOfId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
