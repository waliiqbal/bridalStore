import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  AdminProductListQueryDto,
  CreateProductDto,
  GenerateVariantsDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto/product.dto.js';
import { ProductsAdminService } from './products.admin.service.js';
import { VariantsService } from './variants.service.js';

@Controller('admin/products')
export class ProductsAdminController {
  constructor(
    private readonly products: ProductsAdminService,
    private readonly variants: VariantsService,
  ) {}

  @Get()
  list(@Query() query: AdminProductListQueryDto) {
    return this.products.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }

  @Post(':id/variants/generate')
  generateVariants(@Param('id') id: string, @Body() dto: GenerateVariantsDto) {
    return this.variants.generate(id, dto);
  }

  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variants.update(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.variants.remove(id, variantId);
  }
}
