-- AlterEnum
ALTER TYPE "MenuItemType" ADD VALUE 'TEXT';

-- AlterTable: the footer columns now come from the Footer menu, so these settings are not needed
ALTER TABLE "StoreSettings" DROP COLUMN "footerButtonLink",
DROP COLUMN "footerButtonText",
DROP COLUMN "footerContactText",
DROP COLUMN "footerContactTitle",
DROP COLUMN "footerShopTitle",
DROP COLUMN "tagline";
