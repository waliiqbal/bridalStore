-- AlterEnum
ALTER TYPE "PageSectionType" ADD VALUE 'VIDEO_SHOWCASE';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "placement" TEXT NOT NULL DEFAULT 'top';
