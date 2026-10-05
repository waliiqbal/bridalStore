import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertNoNulls } from '../../../common/validation.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { buildTree, CategoryIndex } from '../../catalog/categories/category-tree.js';
import { CacheTags, RevalidationService } from '../../revalidation/revalidation.service.js';
import type { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu.dto.js';
import {
  buildPublicMenu,
  isMenuItemVisible,
  menuHref,
  normalizeMenuTarget,
  validateMenuTarget,
  type MenuTargetInput,
} from './menu-tree.js';

const ITEM_SELECT = {
  id: true,
  parentId: true,
  label: true,
  type: true,
  url: true,
  imageUrl: true,
  highlight: true,
  sortOrder: true,
  collectionId: true,
  categoryId: true,
  pageId: true,
  collection: { select: { slug: true, title: true, isPublished: true } },
  category: { select: { slug: true, name: true, isVisible: true } },
  page: { select: { slug: true, title: true, isPublished: true } },
} satisfies Prisma.MenuItemSelect;

const ITEM_ORDER: Prisma.MenuItemOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { id: 'asc' }];

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  // Public: 1 menu query (+ batched target lookups), tree built in memory.
  async getPublic(handle: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { handle },
      select: { handle: true, name: true, items: { select: ITEM_SELECT, orderBy: ITEM_ORDER } },
    });
    if (!menu) throw new NotFoundException('Menu not found');
    return { handle: menu.handle, name: menu.name, items: buildPublicMenu(menu.items) };
  }

  listMenus() {
    return this.prisma.menu.findMany({
      select: { id: true, handle: true, name: true, _count: { select: { items: true } } },
      orderBy: { handle: 'asc' },
    });
  }

  // Admin view: every item (including hidden ones, flagged) as a tree.
  async getAdminTree(handle: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { handle },
      select: { id: true, handle: true, name: true, items: { select: ITEM_SELECT, orderBy: ITEM_ORDER } },
    });
    if (!menu) throw new NotFoundException('Menu not found');
    const items = menu.items.map((item) => ({
      ...item,
      href: menuHref(item),
      // Explains to the owner why an item isn't showing in the shop
      isVisibleInShop: isMenuItemVisible(item),
      targetName: item.collection?.title ?? item.category?.name ?? item.page?.title ?? null,
    }));
    return { id: menu.id, handle: menu.handle, name: menu.name, items: buildTree(items) };
  }

  async createItem(handle: string, dto: CreateMenuItemDto) {
    const menuId = await this.menuId(handle);
    const target = await this.validateTarget(dto);
    const parentId = dto.parentId ?? null;
    if (parentId) await this.assertParentInMenu(menuId, parentId);

    const last = await this.prisma.menuItem.aggregate({
      where: { menuId, parentId },
      _max: { sortOrder: true },
    });
    const item = await this.prisma.menuItem.create({
      data: {
        menuId,
        parentId,
        label: dto.label,
        type: dto.type,
        ...target,
        imageUrl: dto.imageUrl ?? null,
        highlight: dto.highlight ?? null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
      select: ITEM_SELECT,
    });
    this.notify(handle);
    return item;
  }

  async updateItem(handle: string, itemId: string, dto: UpdateMenuItemDto) {
    assertNoNulls(dto, ['label', 'type']);
    const menuId = await this.menuId(handle);
    const current = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuId },
      select: { type: true, collectionId: true, categoryId: true, pageId: true, url: true, parentId: true },
    });
    if (!current) throw new NotFoundException('Menu item not found');

    const target = await this.validateTarget({
      type: dto.type ?? current.type,
      collectionId: dto.collectionId === undefined ? current.collectionId : dto.collectionId,
      categoryId: dto.categoryId === undefined ? current.categoryId : dto.categoryId,
      pageId: dto.pageId === undefined ? current.pageId : dto.pageId,
      url: dto.url === undefined ? current.url : dto.url,
    });

    // Moving to another parent: same menu, no cycles, placed at the end.
    let move: { parentId: string | null; sortOrder: number } | undefined;
    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      const parentId = dto.parentId;
      if (parentId) {
        const rows = await this.prisma.menuItem.findMany({
          where: { menuId },
          select: { id: true, parentId: true },
        });
        const index = new CategoryIndex(rows);
        if (!index.get(parentId)) {
          throw new BadRequestException('The selected parent item is not in this menu');
        }
        if (index.wouldCreateCycle(itemId, parentId)) {
          throw new BadRequestException("A menu item can't be placed inside itself or one of its own items");
        }
      }
      const last = await this.prisma.menuItem.aggregate({
        where: { menuId, parentId },
        _max: { sortOrder: true },
      });
      move = { parentId, sortOrder: (last._max.sortOrder ?? -1) + 1 };
    }

    const item = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...target,
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.highlight !== undefined && { highlight: dto.highlight }),
        ...move,
      },
      select: ITEM_SELECT,
    });
    this.notify(handle);
    return item;
  }

  // Children are removed too (onDelete: Cascade).
  async removeItem(handle: string, itemId: string) {
    const menuId = await this.menuId(handle);
    const { count } = await this.prisma.menuItem.deleteMany({ where: { id: itemId, menuId } });
    if (!count) throw new NotFoundException('Menu item not found');
    this.notify(handle);
    return { deleted: true };
  }

  async reorder(handle: string, parentId: string | null, ids: string[]) {
    const menuId = await this.menuId(handle);
    const found = await this.prisma.menuItem.count({ where: { menuId, parentId, id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('All items being reordered must be in this menu, under the same parent');
    }
    await this.prisma.$transaction(
      ids.map((id, sortOrder) => this.prisma.menuItem.update({ where: { id }, data: { sortOrder } })),
    );
    this.notify(handle);
    return { reordered: ids.length };
  }

  private async validateTarget(input: MenuTargetInput) {
    const error = validateMenuTarget(input);
    if (error) throw new BadRequestException(error);
    const target = normalizeMenuTarget(input);

    const exists = await (target.collectionId
      ? this.prisma.collection.count({ where: { id: target.collectionId } })
      : target.categoryId
        ? this.prisma.category.count({ where: { id: target.categoryId } })
        : target.pageId
          ? this.prisma.page.count({ where: { id: target.pageId } })
          : Promise.resolve(1));
    if (!exists) throw new BadRequestException('The selected link target no longer exists');
    return target;
  }

  private async assertParentInMenu(menuId: string, parentId: string) {
    const found = await this.prisma.menuItem.count({ where: { id: parentId, menuId } });
    if (!found) throw new BadRequestException('The selected parent item is not in this menu');
  }

  private async menuId(handle: string): Promise<string> {
    const menu = await this.prisma.menu.findUnique({ where: { handle }, select: { id: true } });
    if (!menu) throw new NotFoundException('Menu not found');
    return menu.id;
  }

  private notify(handle: string) {
    void this.revalidation.notify([CacheTags.menu(handle)]);
  }
}
