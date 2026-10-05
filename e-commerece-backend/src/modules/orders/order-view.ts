import { money, type Money } from '../../common/money/money.js';
import type { PaymentProvider, Prisma } from '../../generated/prisma/client.js';
import { nextStatusesForAdmin, paymentMethodsFor, STATUS_LABELS } from './order-rules.js';

export const ORDER_DETAIL_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  email: true,
  phone: true,
  shipFullName: true,
  shipLine1: true,
  shipLine2: true,
  shipCity: true,
  shipState: true,
  shipPostcode: true,
  shipCountryCode: true,
  currencyCode: true,
  exchangeRate: true,
  subtotal: true,
  discountTotal: true,
  shippingTotal: true,
  taxTotal: true,
  total: true,
  totalAud: true,
  couponCode: true,
  shippingMethod: true,
  trackingNumber: true,
  trackingUrl: true,
  customerNote: true,
  adminNote: true,
  attentionNote: true,
  reservationExpiresAt: true,
  placedAt: true,
  shippedAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productName: true,
      sku: true,
      size: true,
      colour: true,
      imageUrl: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
      variant: { select: { product: { select: { slug: true } } } },
    },
    orderBy: { id: 'asc' },
  },
  statusHistory: {
    select: { from: true, to: true, note: true, changedBy: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  payments: {
    select: {
      id: true,
      provider: true,
      status: true,
      amount: true,
      currencyCode: true,
      providerPaymentId: true,
      providerCaptureId: true,
      errorMessage: true,
      createdAt: true,
      refunds: {
        select: {
          id: true,
          amount: true,
          currencyCode: true,
          reason: true,
          status: true,
          providerRefundId: true,
          createdBy: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  customer: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, passwordHash: true } },
} satisfies Prisma.OrderSelect;

export type OrderDetailRow = Prisma.OrderGetPayload<{ select: typeof ORDER_DETAIL_SELECT }>;

export const ORDER_SUMMARY_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  email: true,
  shipFullName: true,
  shipCountryCode: true,
  currencyCode: true,
  total: true,
  totalAud: true,
  placedAt: true,
  createdAt: true,
  items: { select: { imageUrl: true, quantity: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.OrderSelect;

export type OrderSummaryRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SUMMARY_SELECT }>;

export function orderSummary(row: OrderSummaryRow) {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    email: row.email,
    shipFullName: row.shipFullName,
    shipCountryCode: row.shipCountryCode,
    total: money(row.total, row.currencyCode),
    totalAud: money(row.totalAud, 'AUD'),
    itemCount: row.items.reduce((sum, i) => sum + i.quantity, 0),
    imageUrl: row.items[0]?.imageUrl ?? null,
    placedAt: row.placedAt,
    createdAt: row.createdAt,
  };
}

// availableMethods: providers configured on this server (PaymentConfigService)
function baseView(row: OrderDetailRow, availableMethods: PaymentProvider[]) {
  const m = (amount: number): Money => money(amount, row.currencyCode);
  const pending = row.status === 'PENDING_PAYMENT';
  return {
    orderNumber: row.orderNumber,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    email: row.email,
    phone: row.phone,
    shippingAddress: {
      fullName: row.shipFullName,
      line1: row.shipLine1,
      line2: row.shipLine2,
      city: row.shipCity,
      state: row.shipState,
      postcode: row.shipPostcode,
      countryCode: row.shipCountryCode,
    },
    currencyCode: row.currencyCode,
    items: row.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      // Current link to the product, if it still exists (the snapshot above never changes)
      productSlug: item.variant?.product.slug ?? null,
      sku: item.sku,
      size: item.size,
      colour: item.colour,
      imageUrl: item.imageUrl,
      unitPrice: m(item.unitPrice),
      quantity: item.quantity,
      lineTotal: m(item.lineTotal),
    })),
    totals: {
      subtotal: m(row.subtotal),
      discount: m(row.discountTotal),
      shipping: m(row.shippingTotal),
      // GST included in the total (0 when not applicable)
      tax: m(row.taxTotal),
      total: m(row.total),
    },
    couponCode: row.couponCode,
    shippingMethod: row.shippingMethod,
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    customerNote: row.customerNote,
    placedAt: row.placedAt,
    shippedAt: row.shippedAt,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt,
    // Only while waiting for payment
    payment: pending
      ? {
          methods: paymentMethodsFor(row.currencyCode).filter((m) => availableMethods.includes(m)),
          expiresAt: row.reservationExpiresAt,
        }
      : null,
  };
}

// What shoppers see: no internal notes, payment details or who changed what.
export function customerOrderView(row: OrderDetailRow, availableMethods: PaymentProvider[]) {
  return {
    ...baseView(row, availableMethods),
    timeline: row.statusHistory
      .filter((h) => h.from !== h.to)
      .map((h) => ({ status: h.to, label: STATUS_LABELS[h.to], at: h.createdAt })),
  };
}

export function adminOrderView(row: OrderDetailRow, availableMethods: PaymentProvider[]) {
  const { customer } = row;
  const paid = row.payments.filter((p) => p.status === 'SUCCEEDED' || p.status === 'REFUNDED');
  const refundable = paid.reduce(
    (sum, p) => sum + p.amount - p.refunds.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + r.amount, 0),
    0,
  );
  return {
    id: row.id,
    ...baseView(row, availableMethods),
    totalAud: money(row.totalAud, 'AUD'),
    exchangeRate: row.exchangeRate.toFixed(6),
    adminNote: row.adminNote,
    // Something the owner should look at (mismatched payment, automatic refund...)
    attentionNote: row.attentionNote,
    // Most that can still be refunded (for the refund form)
    refundable: money(Math.max(0, refundable), row.currencyCode),
    reservationExpiresAt: row.reservationExpiresAt,
    // Buttons to show for the next step
    nextStatuses: nextStatusesForAdmin(row.status).map((status) => ({ status, label: STATUS_LABELS[status] })),
    statusHistory: row.statusHistory.map((h) => ({
      from: h.from,
      to: h.to,
      label: STATUS_LABELS[h.to],
      note: h.note,
      changedBy: h.changedBy,
      at: h.createdAt,
    })),
    payments: row.payments.map((p) => ({
      ...p,
      amount: money(p.amount, p.currencyCode),
      refunds: p.refunds.map((r) => ({ ...r, amount: money(r.amount, r.currencyCode) })),
    })),
    customer: customer
      ? {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          hasAccount: customer.passwordHash !== null,
        }
      : null,
    updatedAt: row.updatedAt,
  };
}
