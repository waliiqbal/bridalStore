// Shared building blocks for every customer email, so they all look the same.

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

// Cents in the currency's smallest unit (the shop only offers 2-decimal currencies)
export function formatCents(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currencyCode }).format(amount / 100);
}

export interface EmailParts {
  subject: string;
  text: string;
  html: string;
}

// Wraps the body in a simple, phone-friendly page. Inline styles only (email apps ignore stylesheets).
export function emailLayout(opts: {
  storeName: string;
  heading: string;
  bodyHtml: string;
  footerNote?: string | null;
}): string {
  const footer = opts.footerNote
    ? `<p style="margin:16px 0 0;color:#6b6b6b;font-size:13px">${escapeHtml(opts.footerNote)}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f7f3ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 16px;font-size:13px;letter-spacing:2px;text-transform:uppercase">${escapeHtml(opts.storeName)}</p>
<div style="background:#fff;padding:24px;border:1px solid #e8e1d8">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(opts.heading)}</h1>
${opts.bodyHtml}
</div>${footer}
</div></body></html>`;
}
