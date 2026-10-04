import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { definedOnly } from '../../../common/validation.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { GenerateVariantsDto, UpdateVariantDto } from './dto/product.dto.js';
import { normalizeOptions, planVariants, productSkuCode } from './variant-generator.js';

const VARIANT_SELECT = {
  id: true,
  sku: true,
  size: true,
  colour: true,
  price: true,
  stock: true,
  isActive: true,
  sortOrder: true,
} as const;

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(productId: string, dto: GenerateVariantsDto) {
    const sizes = normalizeOptions(dto.sizes);
    const colours = normalizeOptions(dto.colours);
    if (sizes.length === 0 && colours.length === 0) {
      throw new BadRequestException('Pick at least one size or colour');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        slug: true,
        variants: { select: { size: true, colour: true, sortOrder: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const code = productSkuCode(product.slug, product.id);
    const taken = await this.prisma.productVariant.findMany({
      where: { sku: { startsWith: `MBS-${code}` } },
      select: { sku: true },
    });
    const planned = planVariants({
      code,
      sizes,
      colours,
      existing: product.variants,
      takenSkus: taken.map((t) => t.sku),
    });

    const nextSort = Math.max(-1, ...product.variants.map((v) => v.sortOrder)) + 1;
    if (planned.length > 0) {
      await this.prisma.productVariant.createMany({
        data: planned.map((v, i) => ({
          productId,
          sku: v.sku,
          size: v.size,
          colour: v.colour,
          price: dto.price ?? null,
          stock: dto.stock ?? 0,
          sortOrder: nextSort + i,
        })),
      });
    }

    const combinations = Math.max(sizes.length, 1) * Math.max(colours.length, 1);
    return {
      created: planned.length,
      alreadyExisted: combinations - planned.length,
      variants: await this.prisma.productVariant.findMany({
        where: { productId },
        select: VARIANT_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    };
  }

  async update(productId: string, variantId: string, dto: UpdateVariantDto) {
    await this.assertBelongs(productId, variantId);
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: definedOnly({ ...dto, sku: dto.sku?.trim().toUpperCase() }),
      select: VARIANT_SELECT,
    });
  }

  // A variant that appears in any order is deactivated, never deleted.
  async remove(productId: string, variantId: string) {
    await this.assertBelongs(productId, variantId);
    const ordered = await this.prisma.orderItem.count({ where: { variantId } });
    if (ordered > 0) {
      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
      });
      return {
        deleted: false,
        deactivated: true,
        message:
          'This size/colour has past orders, so it was hidden from the shop instead of deleted.',
      };
    }
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { deleted: true, deactivated: false };
  }

  private async assertBelongs(productId: string, variantId: string) {
    const found = await this.prisma.productVariant.count({
      where: { id: variantId, productId },
    });
    if (!found) throw new NotFoundException('Variant not found');
  }
}
