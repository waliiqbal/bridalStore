-- AlterEnum
ALTER TYPE "PageSectionType" ADD VALUE 'STORE_MAP';

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "mapLatitude" DOUBLE PRECISION,
ADD COLUMN     "mapLongitude" DOUBLE PRECISION,
ADD COLUMN     "storeAddress" TEXT;
