import { Controller, HttpCode, Post, Req, type RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SkipCsrf } from '../../common/csrf/csrf.guard.js';
import { WebhooksService } from './webhooks.service.js';

/**
 * Called by Stripe, Square and PayPal servers. Exempt from the CSRF header
 * (and never rate-limited); every request is verified with the provider's
 * signature over the RAW body (Nest rawBody: true).
 */
@Controller('webhooks')
@SkipCsrf()
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('stripe')
  @HttpCode(200)
  stripe(@Req() req: RawBodyRequest<Request>) {
    return this.webhooks.handle('STRIPE', req.rawBody, req.headers);
  }

  @Post('square')
  @HttpCode(200)
  square(@Req() req: RawBodyRequest<Request>) {
    return this.webhooks.handle('SQUARE', req.rawBody, req.headers);
  }

  @Post('paypal')
  @HttpCode(200)
  paypal(@Req() req: RawBodyRequest<Request>) {
    return this.webhooks.handle('PAYPAL', req.rawBody, req.headers);
  }
}
