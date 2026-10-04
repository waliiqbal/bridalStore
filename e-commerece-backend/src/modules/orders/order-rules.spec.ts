import type { OrderStatus } from '../../generated/prisma/enums.js';
import {
  canTransition,
  formatOrderNumber,
  nextStatusesForAdmin,
  normalizeOrderNumber,
  paymentMethodsFor,
  RESERVATION_MINUTES,
  reservationExpiry,
} from './order-rules.js';

const ALL: OrderStatus[] = ['PENDING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

describe('order status transitions', () => {
  it('admin can only move orders forward along the allowed path', () => {
    const allowed = ALL.flatMap((from) => ALL.filter((to) => canTransition(from, to, 'admin')).map((to) => `${from}→${to}`));
    expect(allowed.sort()).toEqual(
      ['PENDING_PAYMENT→CANCELLED', 'PROCESSING→CANCELLED', 'PROCESSING→SHIPPED', 'SHIPPED→DELIVERED'].sort(),
    );
  });

  it('admin cannot mark paid, refund, un-cancel or go backwards', () => {
    expect(canTransition('PENDING_PAYMENT', 'PROCESSING', 'admin')).toBe(false);
    expect(canTransition('PROCESSING', 'REFUNDED', 'admin')).toBe(false);
    expect(canTransition('CANCELLED', 'PROCESSING', 'admin')).toBe(false);
    expect(canTransition('SHIPPED', 'PROCESSING', 'admin')).toBe(false);
    expect(canTransition('SHIPPED', 'CANCELLED', 'admin')).toBe(false);
    expect(canTransition('DELIVERED', 'SHIPPED', 'admin')).toBe(false);
  });

  it('payments mark orders paid and refunded; the system only cancels unpaid orders', () => {
    expect(canTransition('PENDING_PAYMENT', 'PROCESSING', 'payment')).toBe(true);
    expect(canTransition('CANCELLED', 'PROCESSING', 'payment')).toBe(true);
    expect(canTransition('DELIVERED', 'REFUNDED', 'payment')).toBe(true);
    expect(canTransition('PENDING_PAYMENT', 'CANCELLED', 'system')).toBe(true);
    expect(canTransition('PROCESSING', 'CANCELLED', 'system')).toBe(false);
  });

  it('lists the next buttons for the admin', () => {
    expect(nextStatusesForAdmin('PROCESSING')).toEqual(['SHIPPED', 'CANCELLED']);
    expect(nextStatusesForAdmin('DELIVERED')).toEqual([]);
  });
});

describe('order numbers', () => {
  it('formats sequence values as MBS-<number>', () => {
    expect(formatOrderNumber(10001n)).toBe('MBS-10001');
    expect(formatOrderNumber(123456)).toBe('MBS-123456');
  });

  it('normalizes what shoppers type, rejecting anything else', () => {
    expect(normalizeOrderNumber(' mbs-10001 ')).toBe('MBS-10001');
    expect(normalizeOrderNumber('10001')).toBeNull();
    expect(normalizeOrderNumber("MBS-1' OR 1=1")).toBeNull();
  });
});

describe('checkout helpers', () => {
  it('offers Square + PayPal for AUD and Stripe + PayPal otherwise', () => {
    expect(paymentMethodsFor('AUD')).toEqual(['SQUARE', 'PAYPAL']);
    expect(paymentMethodsFor('USD')).toEqual(['STRIPE', 'PAYPAL']);
    expect(paymentMethodsFor('GBP')).toEqual(['STRIPE', 'PAYPAL']);
  });

  it('holds stock for 30 minutes', () => {
    const now = new Date('2026-10-04T12:00:00Z');
    expect(RESERVATION_MINUTES).toBe(30);
    expect(reservationExpiry(now).toISOString()).toBe('2026-10-04T12:30:00.000Z');
  });
});
