import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MAIL_SERVICE, type MailService } from '../mail/mail.service.js';
import { orderConfirmationEmail, orderShippedEmail, type OrderEmailData } from './order-emails.js';

const ORDER_SELECT = {
  orderNumber: true,
  email: true,
  customerId: true,
  currencyCode: true,
  subtotal: true,
  discountTotal: true,
  shippingTotal: true,
  total: true,
  trackingNumber: true,
  trackingUrl: true,
  shipFullName: true,
  shipLine1: true,
  shipLine2: true,
  shipCity: true,
  shipState: true,
  shipPostcode: true,
  shipCountryCode: true,
  items: {
    select: { productName: true, size: true, colour: true, quantity: true, lineTotal: true },
    orderBy: { id: 'asc' as const },
  },
} as const;

const countryNames = new Intl.DisplayNames('en', { type: 'region' });
const countryName = (code: string) => {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/**
 * Sends the customer emails for an order. Never throws: a broken email service must not
 * stop an order from being paid or shipped, so failures are only logged.
 * The owner can switch each email off in Settings.
 */
@Injectable()
export class OrderEmailsService {
  private readonly logger = new Logger(OrderEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {}

  sendConfirmation(orderId: string): Promise<void> {
    return this.send(orderId, 'sendOrderEmails', orderConfirmationEmail);
  }

  sendShipped(orderId: string): Promise<void> {
    return this.send(orderId, 'sendShippingEmails', orderShippedEmail);
  }

  private async send(
    orderId: string,
    flag: 'sendOrderEmails' | 'sendShippingEmails',
    render: typeof orderConfirmationEmail,
  ): Promise<void> {
    try {
      const [settings, order] = await Promise.all([
        this.prisma.storeSettings.findUnique({
          where: { id: 1 },
          select: { storeName: true, emailFooterNote: true, sendOrderEmails: true, sendShippingEmails: true },
        }),
        this.prisma.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT }),
      ]);
      if (!order || (settings && !settings[flag])) return;

      const storefront = this.config.get('STOREFRONT_URL', { infer: true });
      const data: OrderEmailData = {
        orderNumber: order.orderNumber,
        customerName: order.shipFullName.split(' ')[0] ?? '',
        currencyCode: order.currencyCode,
        items: order.items,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        shippingTotal: order.shippingTotal,
        total: order.total,
        address: [
          order.shipFullName,
          order.shipLine1,
          order.shipLine2,
          [order.shipCity, order.shipState, order.shipPostcode].filter(Boolean).join(' '),
          countryName(order.shipCountryCode),
        ].filter((line): line is string => !!line),
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        orderUrl: order.customerId ? `${storefront}/account/orders/${order.orderNumber}` : null,
      };
      const email = render(data, {
        storeName: settings?.storeName ?? 'Malikah Bridal Studio',
        footerNote: settings?.emailFooterNote ?? null,
      });
      await this.mail.send({ to: order.email, ...email });
    } catch (error) {
      this.logger.error(`Could not send the email for order ${orderId}: ${(error as Error).message}`);
    }
  }
}
