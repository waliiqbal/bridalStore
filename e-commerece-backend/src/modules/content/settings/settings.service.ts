import { Injectable } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../../common/validation.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import type { UpdateSettingsDto } from './dto/settings.dto.js';

const SETTINGS_ID = 1;

// Allow-list: fields added to StoreSettings later stay private until added here.
const PUBLIC_SELECT = {
  storeName: true,
  contactEmail: true,
  contactPhone: true,
  whatsappNumber: true,
  announcementBar: true,
  instagramUrl: true,
  facebookUrl: true,
  tiktokUrl: true,
  metaPixelId: true,
  googleAnalyticsId: true,
  footerPromises: true,
  footerPaymentIcons: true,
} satisfies Prisma.StoreSettingsSelect;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async getPublic() {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: PUBLIC_SELECT,
    });
    if (settings) return settings;
    await this.ensure();
    return this.prisma.storeSettings.findUniqueOrThrow({
      where: { id: SETTINGS_ID },
      select: PUBLIC_SELECT,
    });
  }

  async getAdmin() {
    return this.ensure();
  }

  async update(dto: UpdateSettingsDto) {
    assertNoNulls(dto, [
      'storeName',
      'gstRatePercent',
      'removeGstForExports',
      'sendOrderEmails',
      'sendShippingEmails',
      'autoApproveReviews',
      'footerPaymentIcons',
    ]);
    await this.ensure();
    const { footerPromises, ...rest } = definedOnly(dto);
    const settings = await this.prisma.storeSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...rest,
        // null = back to the built-in wording; a list (even an empty one) is stored as given
        ...(footerPromises !== undefined && {
          footerPromises:
            footerPromises === null
              ? Prisma.JsonNull
              : footerPromises.map(({ title, text }) => ({ title, text })),
        }),
      },
    });
    void this.revalidation.notify([CacheTags.settings]);
    return settings;
  }

  // The settings row normally comes from the seed; create defaults if missing.
  private ensure() {
    return this.prisma.storeSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
  }
}
