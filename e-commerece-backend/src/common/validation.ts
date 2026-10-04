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
