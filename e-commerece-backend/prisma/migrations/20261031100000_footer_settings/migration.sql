-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "footerButtonLink" TEXT,
ADD COLUMN     "footerButtonText" TEXT,
ADD COLUMN     "footerContactText" TEXT,
ADD COLUMN     "footerContactTitle" TEXT,
ADD COLUMN     "footerPaymentIcons" TEXT[] DEFAULT ARRAY['visa', 'mastercard', 'paypal']::TEXT[],
ADD COLUMN     "footerPromises" JSONB,
ADD COLUMN     "footerShopTitle" TEXT,
ADD COLUMN     "tagline" TEXT;
