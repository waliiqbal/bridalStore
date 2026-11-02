import type { Prisma } from '../../../generated/prisma/client.js';
import type { SectionBannerDto } from './dto/section-banner.dto.js';

// What the owner sees for each banner of a block, in order
export const SECTION_BANNERS_SELECT = {
  select: {
    id: true,
    title: true,
    subtitle: true,
    imageUrl: true,
    mobileImageUrl: true,
    linkUrl: true,
    buttonText: true,
    isActive: true,
  },
  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
} satisfies Prisma.PageSection$bannersArgs;

const blank = (text: string | null | undefined) => (text?.trim() ? text.trim() : null);

// The rows to save for a block's banner list. The position in the list becomes the order.
export function bannerRows(sectionId: string, banners: SectionBannerDto[]): Prisma.PromoBannerCreateManyInput[] {
  return banners.map((banner, sortOrder) => ({
    sectionId,
    sortOrder,
    imageUrl: banner.imageUrl,
    title: blank(banner.title),
    subtitle: blank(banner.subtitle),
    mobileImageUrl: blank(banner.mobileImageUrl),
    linkUrl: blank(banner.linkUrl),
    buttonText: blank(banner.buttonText),
    isActive: banner.isActive ?? true,
  }));
}

// The list sent when saving a block replaces the block's banners (inside the caller's transaction)
export async function replaceSectionBanners(
  tx: Prisma.TransactionClient,
  sectionId: string,
  banners: SectionBannerDto[],
) {
  await tx.promoBanner.deleteMany({ where: { sectionId } });
  if (banners.length) await tx.promoBanner.createMany({ data: bannerRows(sectionId, banners) });
}
