import { Matches } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

// Update DTOs use PartialType, where null passes validation. Fields that can't
// be cleared must be rejected explicitly before reaching Prisma.
export function assertNoNulls<T extends object>(dto: T, keys: (keyof T)[]) {
  for (const key of keys) {
    if (dto[key] === null) {
      throw new BadRequestException(`${String(key)} cannot be empty`);
    }
  }
}

// Drops undefined keys so Prisma only updates fields that were sent.
export function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// Links an admin can enter: site paths ("/pages/about"), http(s), mailto:, tel:.
// Rejects javascript:, data: and protocol-relative ("//evil.com") URLs.
export const SAFE_LINK = /^(\/(?!\/)\S*|https?:\/\/\S+|mailto:\S+|tel:[+0-9 ()-]+)$/i;
export const IMAGE_URL = /^(https?:\/\/\S+|\/uploads\/\S+)$/i;

export const IsSafeLink = () =>
  Matches(SAFE_LINK, {
    message: '$property must be a site path like /pages/about, or a full http(s), mailto: or tel: link',
  });

export const IsImageUrl = () =>
  Matches(IMAGE_URL, { message: '$property must be an uploaded image URL' });
