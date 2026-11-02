import type { Prisma } from '../../../generated/prisma/client.js';
import type { SectionVideoDto } from './dto/section-video.dto.js';

// What the owner sees for each video of a block, in order
export const SECTION_VIDEOS_SELECT = {
  select: { id: true, title: true, videoUrl: true, posterUrl: true, linkUrl: true, isActive: true },
  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
} satisfies Prisma.PageSection$videosArgs;

const blank = (text: string | null | undefined) => (text?.trim() ? text.trim() : null);

// The rows to save for a block's video list. The position in the list becomes the order.
export function videoRows(sectionId: string, videos: SectionVideoDto[]): Prisma.VideoCreateManyInput[] {
  return videos.map((video, sortOrder) => ({
    sectionId,
    sortOrder,
    videoUrl: video.videoUrl,
    title: blank(video.title),
    posterUrl: blank(video.posterUrl),
    linkUrl: blank(video.linkUrl),
    isActive: video.isActive ?? true,
  }));
}

// The list sent when saving a block replaces the block's videos (inside the caller's transaction)
export async function replaceSectionVideos(
  tx: Prisma.TransactionClient,
  sectionId: string,
  videos: SectionVideoDto[],
) {
  await tx.video.deleteMany({ where: { sectionId } });
  if (videos.length) await tx.video.createMany({ data: videoRows(sectionId, videos) });
}
