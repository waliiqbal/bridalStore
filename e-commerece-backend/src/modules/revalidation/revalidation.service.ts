import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';

// Cache tags shared with the frontend (documented in CLAUDE.md). The frontend
// tags its fetches with these and calls revalidateTag() when notified.
export const CacheTags = {
  product: (slug: string) => `product:${slug}`,
  products: 'products',
  collection: (slug: string) => `collection:${slug}`,
  collections: 'collections',
  category: (slug: string) => `category:${slug}`,
  categories: 'categories',
  page: (slug: string) => `page:${slug}`,
  pages: 'pages',
  menu: (handle: string) => `menu:${handle}`,
  banners: 'banners',
  faqs: 'faqs',
  settings: 'settings',
  redirects: 'redirects',
  currencies: 'currencies',
} as const;

const TIMEOUT_MS = 5000;

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);
  private readonly url?: string;
  private readonly secret?: string;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('FRONTEND_REVALIDATE_URL', { infer: true });
    this.secret = config.get('REVALIDATE_SECRET', { infer: true });
  }

  /**
   * Fire-and-forget: callers don't await it. The returned promise never
   * rejects, so a slow or offline storefront can't fail an admin request.
   */
  notify(tags: (string | null | undefined)[]): Promise<void> {
    const unique = [...new Set(tags.filter((t): t is string => !!t))];
    if (!this.url || unique.length === 0) return Promise.resolve();
    return this.send(this.url, unique);
  }

  private async send(url: string, tags: string[]): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': this.secret ?? '',
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`Storefront refresh for [${tags.join(', ')}] failed with HTTP ${res.status}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Storefront refresh for [${tags.join(', ')}] failed: ${reason}`);
    }
  }
}
