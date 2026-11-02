-- The homepage promotion banners (Banners screen, place "home_promo") become a "Side-by-side banners"
-- block on the home page, so the owner can put them anywhere. Existing banners are moved into it.

-- CreateTable
CREATE TABLE "PromoBanner" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "linkUrl" TEXT,
    "buttonText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoBanner_sectionId_sortOrder_idx" ON "PromoBanner"("sectionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PromoBanner" ADD CONSTRAINT "PromoBanner_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move the existing promotion banners. The new block goes right after the first Collection tiles block (where
-- the promo banners always showed), or at the end if the page has no tiles. Nothing is deleted unless it was moved.
DO $$
DECLARE
  home_id TEXT;
  tiles_pos INTEGER;
  new_pos INTEGER;
BEGIN
  SELECT "id" INTO home_id FROM "Page" WHERE "slug" = 'home';
  IF home_id IS NOT NULL AND EXISTS (SELECT 1 FROM "Banner" WHERE "placement" = 'home_promo') THEN
    SELECT MIN("sortOrder") INTO tiles_pos FROM "PageSection"
      WHERE "pageId" = home_id AND "type" = 'COLLECTION_TILES' AND "isActive";
    IF tiles_pos IS NULL THEN
      SELECT COALESCE(MAX("sortOrder"), -1) + 1 INTO new_pos FROM "PageSection" WHERE "pageId" = home_id;
    ELSE
      new_pos := tiles_pos + 1;
      UPDATE "PageSection" SET "sortOrder" = "sortOrder" + 1 WHERE "pageId" = home_id AND "sortOrder" >= new_pos;
    END IF;

    INSERT INTO "PageSection" ("id", "pageId", "type", "collectionIds", "sortOrder", "isActive")
    VALUES ('migrated-promo-banners', home_id, 'PROMO_BANNERS', ARRAY[]::TEXT[], new_pos, true);

    -- A banner that was switched off, not started yet or already over stays switched off
    INSERT INTO "PromoBanner" ("id", "sectionId", "title", "subtitle", "imageUrl", "mobileImageUrl", "linkUrl", "buttonText", "sortOrder", "isActive", "createdAt", "updatedAt")
    SELECT md5(b."id" || 'promo'), 'migrated-promo-banners', b."title", b."subtitle", b."imageUrl", b."mobileImageUrl", b."linkUrl", b."buttonText", b."sortOrder",
           (b."isActive" AND (b."startsAt" IS NULL OR b."startsAt" <= now()) AND (b."endsAt" IS NULL OR b."endsAt" > now())),
           b."createdAt", now()
    FROM "Banner" b WHERE b."placement" = 'home_promo';

    DELETE FROM "Banner" WHERE "placement" = 'home_promo';
  END IF;
END $$;
