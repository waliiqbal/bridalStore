import { describe, expect, it } from 'vitest';
import { orderConfirmationEmail, orderShippedEmail, type OrderEmailData } from './order-emails.js';

const data: OrderEmailData = {
  orderNumber: 'MBS-10001',
  customerName: 'Ayesha',
  currencyCode: 'AUD',
  items: [{ productName: 'Ruby <Red> Lehenga', size: 'M', colour: 'Red', quantity: 1, lineTotal: 120000 }],
  subtotal: 120000,
  discountTotal: 12000,
  shippingTotal: 0,
  total: 108000,
  address: ['Ayesha Khan', '1 Test St', 'Sydney NSW 2000', 'Australia'],
  trackingNumber: 'TRK123',
  trackingUrl: 'https://track.example.com/TRK123',
  orderUrl: 'https://shop.example.com/account/orders/MBS-10001',
};
const brand = { storeName: 'Malikah Bridal Studio', footerNote: 'Open Mon-Sat 10-5' };

describe('order confirmation email', () => {
  const email = orderConfirmationEmail(data, brand);

  it('names the order and shows money from the order snapshot', () => {
    expect(email.subject).toBe('Order MBS-10001 confirmed');
    expect(email.text).toContain('Total: $1,080.00');
    expect(email.text).toContain('Discount: -$120.00');
    expect(email.text).toContain('Shipping: Free');
  });

  it('includes address, order link and the owner footer note', () => {
    expect(email.text).toContain('1 Test St');
    expect(email.text).toContain(data.orderUrl);
    expect(email.html).toContain('Open Mon-Sat 10-5');
  });

  it('escapes product names in the HTML', () => {
    expect(email.html).toContain('Ruby &lt;Red&gt; Lehenga');
    expect(email.html).not.toContain('<Red>');
  });

  it('leaves out the discount line and order link when there are none', () => {
    const plain = orderConfirmationEmail(
      { ...data, discountTotal: 0, orderUrl: null },
      { ...brand, footerNote: null },
    );
    expect(plain.text).not.toContain('Discount');
    expect(plain.text).not.toContain('See your order');
  });
});

describe('order shipped email', () => {
  it('shows the tracking number and link', () => {
    const email = orderShippedEmail(data, brand);
    expect(email.subject).toBe('Your order MBS-10001 has shipped');
    expect(email.text).toContain('Tracking number: TRK123');
    expect(email.html).toContain('https://track.example.com/TRK123');
  });
});
