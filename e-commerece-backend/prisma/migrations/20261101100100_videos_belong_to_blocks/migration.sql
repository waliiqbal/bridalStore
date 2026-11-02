-- Every video now belongs to one homepage block (a "Banner video" or "Trending videos" block) instead of
-- sitting in one shared list. Videos that already exist are moved into blocks so nothing is lost.

-- AlterTable
ALTER TABLE "Video" ADD COLUMN "sectionId" TEXT;

-- Videos "under the top banners" become one Banner video block at the top of the home page
INSERT INTO "PageSection" ("id", "pageId", "type", "collectionIds", "sortOrder", "isActive")
SELECT 'migrated-video-banner', p."id", 'VIDEO_BANNER', ARRAY[]::TEXT[],
       COALESCE((SELECT MIN(s."sortOrder") FROM "PageSection" s WHERE s."pageId" = p."id"), 0) - 1, true
FROM "Page" p
WHERE p."slug" = 'home' AND EXISTS (SELECT 1 FROM "Video" v WHERE v."placement" = 'top');

UPDATE "Video" SET "sectionId" = 'migrated-video-banner' WHERE "placement" = 'top';

-- Trending videos: if there was no Trending block, add one (switched off, as the videos were not showing either)
INSERT INTO "PageSection" ("id", "pageId", "type", "title", "collectionIds", "sortOrder", "isActive")
SELECT 'migrated-video-showcase', p."id", 'VIDEO_SHOWCASE', 'Trending videos', ARRAY[]::TEXT[],
       COALESCE((SELECT MAX(s."sortOrder") FROM "PageSection" s WHERE s."pageId" = p."id"), -1) + 1, false
FROM "Page" p
WHERE p."slug" = 'home'
  AND EXISTS (SELECT 1 FROM "Video" v WHERE v."placement" = 'showcase')
  AND NOT EXISTS (SELECT 1 FROM "PageSection" s WHERE s."type" = 'VIDEO_SHOWCASE');

-- The videos go to the first Trending block; any further Trending block gets its own copy of them,
-- so every block on the website looks exactly as before
UPDATE "Video" SET "sectionId" = (
  SELECT s."id" FROM "PageSection" s WHERE s."type" = 'VIDEO_SHOWCASE' ORDER BY s."sortOrder", s."id" LIMIT 1
) WHERE "placement" = 'showcase';

INSERT INTO "Video" ("id", "title", "videoUrl", "posterUrl", "linkUrl", "sortOrder", "isActive", "createdAt", "updatedAt", "sectionId")
SELECT md5(v."id" || s."id"), v."title", v."videoUrl", v."posterUrl", v."linkUrl", v."sortOrder", v."isActive", v."createdAt", v."updatedAt", s."id"
FROM "Video" v
JOIN "PageSection" s ON s."type" = 'VIDEO_SHOWCASE' AND s."id" <> v."sectionId"
WHERE v."placement" = 'showcase';

-- Stops here (and changes nothing) if a video still has no block
ALTER TABLE "Video" ALTER COLUMN "sectionId" SET NOT NULL;

-- DropIndex
DROP INDEX "Video_isActive_sortOrder_idx";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "placement";

-- CreateIndex
CREATE INDEX "Video_sectionId_sortOrder_idx" ON "Video"("sectionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
