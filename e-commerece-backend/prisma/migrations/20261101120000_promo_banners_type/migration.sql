-- AlterEnum
-- (a new value cannot be used in the same migration that adds it, so the data move is in the next one)
ALTER TYPE "PageSectionType" ADD VALUE 'PROMO_BANNERS';
