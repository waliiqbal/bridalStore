import { emailLayout, escapeHtml, formatCents, type EmailParts } from '../mail/email-layout.js';

// What the two order emails need. Everything comes from the order snapshot, never from live product data.
export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  currencyCode: string;
  items: {
    productName: string;
    size: string | null;
    colour: string | null;
    quantity: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  address: string[];
  trackingNumber: string | null;
  trackingUrl: string | null;
  // Link to the order page for customers with an account, otherwise null
  orderUrl: string | null;
}

export interface EmailBrand {
  storeName: string;
  footerNote: string | null;
}

type Item = OrderEmailData['items'][number];

const itemLabel = (i: Item) =>
  [i.productName, [i.colour, i.size && `Size ${i.size}`].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' - ');

const greeting = (d: OrderEmailData) => (d.customerName ? `Hi ${d.customerName},` : 'Hi,');

const itemsText = (d: OrderEmailData) =>
  d.items.map((i) => `${i.quantity} x ${itemLabel(i)}  ${formatCents(i.lineTotal, d.currencyCode)}`);

function itemsHtml(d: OrderEmailData): string {
  const rows = d.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity} &times; ${escapeHtml(itemLabel(i))}</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${formatCents(i.lineTotal, d.currencyCode)}</td></tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>`;
}

const addressHtml = (d: OrderEmailData) =>
  `<p style="margin-top:0;font-size:14px;line-height:1.5">${d.address.map(escapeHtml).join('<br>')}</p>`;

const orderLinkHtml = (d: OrderEmailData) =>
  d.orderUrl ? `<p><a href="${escapeHtml(d.orderUrl)}" style="color:#1a1a1a">See your order</a></p>` : '';

const tail = (d: OrderEmailData, brand: EmailBrand) => [
  ...(d.orderUrl ? ['', `See your order: ${d.orderUrl}`] : []),
  ...(brand.footerNote ? ['', brand.footerNote] : []),
  '',
  brand.storeName,
];

export function orderConfirmationEmail(d: OrderEmailData, brand: EmailBrand): EmailParts {
  const money = (n: number) => formatCents(n, d.currencyCode);
  const shipping = d.shippingTotal === 0 ? 'Free' : money(d.shippingTotal);
  const text = [
    greeting(d),
    '',
    `Thank you for your order ${d.orderNumber}. We have received your payment and will start preparing it.`,
    '',
    ...itemsText(d),
    '',
    `Subtotal: ${money(d.subtotal)}`,
    ...(d.discountTotal > 0 ? [`Discount: -${money(d.discountTotal)}`] : []),
    `Shipping: ${shipping}`,
    `Total: ${money(d.total)}`,
    '',
    'Delivering to:',
    ...d.address,
    ...tail(d, brand),
  ].join('\n');

  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0${bold ? ';font-weight:600' : ''}">${label}</td><td style="text-align:right${bold ? ';font-weight:600' : ''}">${value}</td></tr>`;
  const body = `<p>${escapeHtml(greeting(d))}</p>
<p>Thank you for your order <strong>${escapeHtml(d.orderNumber)}</strong>. We have received your payment and will start preparing it.</p>
${itemsHtml(d)}
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;border-top:1px solid #e8e1d8">
${row('Subtotal', money(d.subtotal))}${d.discountTotal > 0 ? row('Discount', `-${money(d.discountTotal)}`) : ''}${row('Shipping', shipping)}${row('Total', money(d.total), true)}
</table>
<p style="margin-bottom:4px;font-weight:600">Delivering to</p>${addressHtml(d)}
${orderLinkHtml(d)}`;

  return {
    subject: `Order ${d.orderNumber} confirmed`,
    text,
    html: emailLayout({
      storeName: brand.storeName,
      heading: 'Thank you for your order',
      bodyHtml: body,
      footerNote: brand.footerNote,
    }),
  };
}

export function orderShippedEmail(d: OrderEmailData, brand: EmailBrand): EmailParts {
  const text = [
    greeting(d),
    '',
    `Good news, your order ${d.orderNumber} is on its way.`,
    ...(d.trackingNumber ? ['', `Tracking number: ${d.trackingNumber}`] : []),
    ...(d.trackingUrl ? [`Track it here: ${d.trackingUrl}`] : []),
    '',
    'Delivering to:',
    ...d.address,
    '',
    ...itemsText(d),
    ...tail(d, brand),
  ].join('\n');

  const body = `<p>${escapeHtml(greeting(d))}</p>
<p>Good news, your order <strong>${escapeHtml(d.orderNumber)}</strong> is on its way.</p>
${d.trackingNumber ? `<p style="font-size:14px">Tracking number: <strong>${escapeHtml(d.trackingNumber)}</strong></p>` : ''}
${d.trackingUrl ? `<p><a href="${escapeHtml(d.trackingUrl)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 18px;text-decoration:none;font-size:14px">Track your parcel</a></p>` : ''}
<p style="margin-bottom:4px;font-weight:600">Delivering to</p>${addressHtml(d)}
${itemsHtml(d)}
${orderLinkHtml(d)}`;

  return {
    subject: `Your order ${d.orderNumber} has shipped`,
    text,
    html: emailLayout({
      storeName: brand.storeName,
      heading: 'Your order is on its way',
      bodyHtml: body,
      footerNote: brand.footerNote,
    }),
  };
}
