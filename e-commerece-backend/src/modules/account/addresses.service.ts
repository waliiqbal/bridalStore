import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { assertNoNulls, definedOnly } from '../../common/validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateAddressDto, UpdateAddressDto } from './dto/account.dto.js';

export const MAX_ADDRESSES = 20;

const SELECT = {
  id: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  state: true,
  postcode: true,
  countryCode: true,
  isDefault: true,
  createdAt: true,
} as const;

const ORDER = [{ isDefault: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'asc' as const }];

// Exactly one default address whenever the customer has any.
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(customerId: string) {
    return this.prisma.address.findMany({ where: { customerId }, select: SELECT, orderBy: ORDER });
  }

  async create(customerId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { customerId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(`You can save up to ${MAX_ADDRESSES} addresses. Please remove one first.`);
    }
    // The first address is always the default
    const isDefault = count === 0 || dto.isDefault === true;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, customerId, isDefault }, select: SELECT });
    });
  }

  async update(customerId: string, id: string, dto: UpdateAddressDto) {
    assertNoNulls(dto, ['fullName', 'line1', 'city', 'postcode', 'countryCode', 'isDefault']);
    const current = await this.findOwn(customerId, id);
    if (dto.isDefault === false && current.isDefault) {
      throw new BadRequestException('Choose another address as your default instead');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { customerId, isDefault: true, id: { not: id } }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id }, data: definedOnly(dto), select: SELECT });
    });
  }

  async setDefault(customerId: string, id: string) {
    return this.update(customerId, id, { isDefault: true });
  }

  // Deleting the default promotes the most recently added remaining address.
  async remove(customerId: string, id: string) {
    const current = await this.findOwn(customerId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (current.isDefault) {
        const next = await tx.address.findFirst({
          where: { customerId },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return { deleted: true };
  }

  private async findOwn(customerId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, customerId },
      select: { id: true, isDefault: true },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }
}
