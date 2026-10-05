import { Injectable } from '@nestjs/common';
import { definedOnly } from '../../common/validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CUSTOMER_PROFILE_SELECT } from '../auth/customer/customer-session.js';
import type { UpdateProfileDto } from './dto/account.dto.js';

const blankToNull = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() || null;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  update(customerId: string, dto: UpdateProfileDto) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: definedOnly({
        firstName: blankToNull(dto.firstName),
        lastName: blankToNull(dto.lastName),
        phone: blankToNull(dto.phone),
        marketingOptIn: dto.marketingOptIn,
      }),
      select: CUSTOMER_PROFILE_SELECT,
    });
  }
}
