import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DAY_MS } from '../../common/cookies.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { normalizeCouponCode, PricingService } from '../pricing/pricing.service.js';
import {
  capNotice,
  capQuantity,
  CART_TTL_DAYS,
  lineStatus,
  planCartMerge,
} from './cart-rules.js';
import {
  buildCartView,
  CART_VIEW_SELECT,
  pricingLines,
  type CartRow,
  type CartView,
} from './cart-view.js';

// Who is asking: the cart cookie token and/or the signed-in customer.
export interface CartContext {
  token?: string;
  customerId?: string;
}

// Optional pricing inputs every cart response accepts.
export interface CartPricingOptions {
  currency?: string;
  country?: string;
  shippingRateId?: string;
}

// cartToken: string → set the cart cookie; null → clear it; undefined → leave it.
export interface CartResult {
  cart: CartView;
  cartToken?: string | null;
}

type Tx = Prisma.TransactionClient;

const expiryFrom = (now = new Date()) => new Date(now.getTime() + CART_TTL_DAYS * DAY_MS);
const newToken = () => randomBytes(32).toString('base64url');
// Reads extend the expiry at most once a day, so reading stays (almost) write-free.
const REFRESH_AFTER_MS = DAY_MS;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /**
   * Fixed queries: cart (+ batched items/variants/products/images), then the
   * pricing context in parallel (currency, settings, zone + rates, coupon),
   * and at most one small update (currency or expiry).
   */
  async get(ctx: CartContext, options: CartPricingOptions = {}): Promise<CartResult> {
    const row = await this.loadCart(ctx);
    const cart = await this.view(row, options);

    if (row) {
      const now = new Date();
      const data: Prisma.CartUpdateInput = {};
      if (options.currency && cart.currencyCode !== row.currencyCode) data.currencyCode = cart.currencyCode;
      if (expiryFrom(now).getTime() - row.expiresAt.getTime() > REFRESH_AFTER_MS) data.expiresAt = expiryFrom(now);
      if (Object.keys(data).length) {
        await this.prisma.cart.update({ where: { id: row.id }, data, select: { id: true } });
      }
    }
    return { cart };
  }

  // The cart with everything checkout and pricing need (or null).
  loadCart(ctx: CartContext, db: PrismaService | Tx = this.prisma): Promise<CartRow | null> {
    return this.findCart(db, ctx, CART_VIEW_SELECT);
  }

  async addItem(
    ctx: CartContext,
    variantId: string,
    quantity: number,
    options: CartPricingOptions = {},
  ): Promise<CartResult> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, isActive: true, product: { select: { status: true } } },
    });
    if (!variant) throw new NotFoundException('This item is no longer available');
    const state = lineStatus({
      productStatus: variant.product.status,
      variantActive: variant.isActive,
      stock: variant.stock,
      quantity,
    });
    if (state.status === 'UNAVAILABLE') throw new ConflictException('This item is no longer available');
    if (state.status === 'OUT_OF_STOCK') throw new ConflictException('Sorry, this size is sold out');

    const { cart, notice } = await this.prisma.$transaction(async (tx) => {
      const target = await this.getOrCreateCart(tx, ctx);
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: target.id, variantId } },
        select: { quantity: true },
      });
      const desired = (existing?.quantity ?? 0) + quantity;
      const stored = capQuantity(desired, variant.stock);
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: target.id, variantId } },
        create: { cartId: target.id, variantId, quantity: stored },
        update: { quantity: stored },
      });
      await this.touch(tx, target.id);
      return { cart: target, notice: capNotice(desired, stored, variant.stock) };
    });

    const owner = ctx.customerId ? { customerId: ctx.customerId } : { token: cart.token };
    return this.respond(owner, options, notice, cart.created ? cart.token : undefined);
  }

  async updateItem(ctx: CartContext, itemId: string, quantity: number, options: CartPricingOptions = {}) {
    const item = await this.findOwnItem(ctx, itemId);
    const stored = capQuantity(quantity, item.variant.stock);
    await this.prisma.$transaction([
      this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: stored } }),
      this.prisma.cart.update({ where: { id: item.cartId }, data: { expiresAt: expiryFrom() } }),
    ]);
    return this.respond(ctx, options, capNotice(quantity, stored, item.variant.stock));
  }

  async removeItem(ctx: CartContext, itemId: string, options: CartPricingOptions = {}) {
    const item = await this.findOwnItem(ctx, itemId);
    await this.prisma.$transaction([
      this.prisma.cartItem.delete({ where: { id: itemId } }),
      this.prisma.cart.update({ where: { id: item.cartId }, data: { expiresAt: expiryFrom() } }),
    ]);
    return this.respond(ctx, options, null);
  }

  // Empties the bag by deleting the cart; the cookie is cleared too.
  async clear(ctx: CartContext, options: CartPricingOptions = {}): Promise<CartResult> {
    const cart = await this.findCart(this.prisma, ctx, { id: true });
    if (cart) await this.prisma.cart.delete({ where: { id: cart.id } });
    return { cart: await this.view(null, options), cartToken: null };
  }

  // One coupon per cart. An invalid code is rejected with the reason and not saved.
  async applyCoupon(ctx: CartContext, code: string, options: CartPricingOptions = {}): Promise<CartResult> {
    const row = await this.loadCart(ctx);
    if (!row?.items.length) throw new BadRequestException('Add something to your bag before using a code');

    const couponCode = normalizeCouponCode(code);
    const pricingCtx = await this.pricing.loadContext({
      currencyCode: options.currency ?? row.currencyCode,
      country: options.country,
      shippingRateId: options.shippingRateId,
      couponCode,
      estimateShipping: true,
    });
    const priced = this.pricing.calculate(pricingLines(row), pricingCtx);
    if (!priced.coupon?.valid) throw new BadRequestException(priced.coupon?.message ?? 'This code is not valid');

    await this.prisma.cart.update({
      where: { id: row.id },
      data: { couponCode: priced.coupon.code, expiresAt: expiryFrom() },
    });
    return this.respond(ctx, options, null);
  }

  async removeCoupon(ctx: CartContext, options: CartPricingOptions = {}): Promise<CartResult> {
    const cart = await this.findCart(this.prisma, ctx, { id: true });
    if (cart) await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    return this.respond(ctx, options, null);
  }

  /**
   * On login/register: move the guest cart into the customer's cart (one
   * cart per customer). Returns the customer's cart token for the cookie,
   * or null if they have no cart.
   */
  async mergeOnLogin(guestToken: string | undefined, customerId: string): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const itemSelect = { select: { variantId: true, quantity: true } };
      const [guest, own] = await Promise.all([
        guestToken
          ? tx.cart.findUnique({
              where: { token: guestToken },
              select: { id: true, token: true, customerId: true, couponCode: true, items: itemSelect },
            })
          : null,
        tx.cart.findUnique({
          where: { customerId },
          select: { id: true, token: true, couponCode: true, items: itemSelect },
        }),
      ]);
      // Another customer's cart is never merged
      const usableGuest = guest && (!guest.customerId || guest.customerId === customerId) ? guest : null;
      if (!usableGuest || usableGuest.id === own?.id) return own?.token ?? null;

      if (!own) {
        await tx.cart.update({
          where: { id: usableGuest.id },
          data: { customerId, expiresAt: expiryFrom() },
        });
        return usableGuest.token;
      }

      const variantIds = [...new Set([...own.items, ...usableGuest.items].map((i) => i.variantId))];
      const stock = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, stock: true },
      });
      const writes = planCartMerge(own.items, usableGuest.items, new Map(stock.map((v) => [v.id, v.stock])));
      for (const line of writes) {
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: own.id, variantId: line.variantId } },
          create: { cartId: own.id, variantId: line.variantId, quantity: line.quantity },
          update: { quantity: line.quantity },
        });
      }
      await tx.cart.delete({ where: { id: usableGuest.id } });
      await tx.cart.update({
        where: { id: own.id },
        // Keep the customer's coupon, or bring the guest's if they had none
        data: { expiresAt: expiryFrom(), couponCode: own.couponCode ?? usableGuest.couponCode },
      });
      return own.token;
    });
  }

  // Removes carts inactive for 30 days. Safe to run on a schedule.
  async deleteExpired(now = new Date()): Promise<number> {
    const { count } = await this.prisma.cart.deleteMany({ where: { expiresAt: { lt: now } } });
    return count;
  }

  private async view(row: CartRow | null, options: CartPricingOptions, notice: string | null = null) {
    const pricingCtx = await this.pricing.loadContext({
      currencyCode: options.currency ?? row?.currencyCode,
      country: options.country,
      shippingRateId: options.shippingRateId,
      couponCode: row?.couponCode,
      estimateShipping: true,
    });
    return buildCartView(row, this.pricing.calculate(pricingLines(row), pricingCtx), pricingCtx, notice);
  }

  private async respond(
    ctx: CartContext,
    options: CartPricingOptions,
    notice: string | null,
    cartToken?: string,
  ): Promise<CartResult> {
    const row = await this.loadCart(ctx);
    return { cart: await this.view(row, options, notice), cartToken };
  }

  /**
   * Signed in → the customer's cart (or, if they have none yet, an unowned
   * guest cart from the cookie). Guest → the cookie's cart, only if it does
   * not belong to a customer.
   */
  private async findCart<S extends Prisma.CartSelect>(db: PrismaService | Tx, ctx: CartContext, select: S) {
    const withOwner = { ...select, customerId: true } as S & { customerId: true };
    if (ctx.customerId) {
      const own = await db.cart.findUnique({ where: { customerId: ctx.customerId }, select: withOwner });
      if (own) return own;
    }
    if (!ctx.token) return null;
    const cart = await db.cart.findUnique({ where: { token: ctx.token }, select: withOwner });
    return cart && !(cart as { customerId: string | null }).customerId ? cart : null;
  }

  private async getOrCreateCart(tx: Tx, ctx: CartContext) {
    const existing = await this.findCart(tx, ctx, { id: true, token: true, customerId: true });
    if (existing) {
      // A signed-in customer adopting the guest cart from their cookie
      if (ctx.customerId && !existing.customerId) {
        await tx.cart.update({ where: { id: existing.id }, data: { customerId: ctx.customerId } });
      }
      return { id: existing.id, token: existing.token, created: false };
    }
    const created = await tx.cart.create({
      data: { token: newToken(), customerId: ctx.customerId ?? null, expiresAt: expiryFrom() },
      select: { id: true, token: true },
    });
    return { ...created, created: true };
  }

  private touch(tx: Tx, cartId: string) {
    return tx.cart.update({ where: { id: cartId }, data: { expiresAt: expiryFrom() }, select: { id: true } });
  }

  private async findOwnItem(ctx: CartContext, itemId: string) {
    const cart = await this.findCart(this.prisma, ctx, { id: true });
    const item = cart
      ? await this.prisma.cartItem.findFirst({
          where: { id: itemId, cartId: cart.id },
          select: { cartId: true, variant: { select: { stock: true } } },
        })
      : null;
    if (!item) throw new NotFoundException('This item is not in your bag');
    return item;
  }
}
