import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSettingsDto } from './settings.dto.js';

const check = (input: object) => validate(plainToInstance(UpdateSettingsDto, input));

describe('UpdateSettingsDto footer fields', () => {
  it('accepts the footer promises and payment icons', async () => {
    const errors = await check({
      footerPromises: [{ title: 'Shipped worldwide', text: 'Delivery to your country' }],
      footerPaymentIcons: ['visa', 'paypal'],
    });
    expect(errors).toHaveLength(0);
  });

  it('allows an empty promise list (it hides the strip) and no payment logos', async () => {
    expect(await check({ footerPromises: [], footerPaymentIcons: [] })).toHaveLength(0);
  });

  it('rejects more than 3 promises and an unknown payment logo', async () => {
    const promise = { title: 'A', text: 'B' };
    expect(await check({ footerPromises: [promise, promise, promise, promise] })).not.toHaveLength(0);
    expect(await check({ footerPaymentIcons: ['bitcoin'] })).not.toHaveLength(0);
  });

  it('strips HTML tags from a promise', () => {
    const dto = plainToInstance(UpdateSettingsDto, { footerPromises: [{ title: '<b>Hi</b>', text: 'x' }] });
    expect(dto.footerPromises?.[0].title).toBe('Hi');
  });

  it('accepts the shop address and map coordinates, and lets them be cleared', async () => {
    expect(
      await check({ storeAddress: 'Liverpool, NSW, Australia', mapLatitude: -33.923199, mapLongitude: 150.9151 }),
    ).toHaveLength(0);
    expect(await check({ storeAddress: null, mapLatitude: null, mapLongitude: null })).toHaveLength(0);
  });

  it('rejects coordinates outside the globe and strips tags from the address', async () => {
    expect(await check({ mapLatitude: 95 })).not.toHaveLength(0);
    expect(await check({ mapLongitude: -181 })).not.toHaveLength(0);
    const dto = plainToInstance(UpdateSettingsDto, { storeAddress: '<b>Liverpool</b> NSW' });
    expect(dto.storeAddress).toBe('Liverpool NSW');
  });

  it('still validates the older fields', async () => {
    expect(await check({ instagramUrl: 'http://not-https.com' })).not.toHaveLength(0);
    expect(await check({ googleAnalyticsId: 'G-ABC1234567' })).toHaveLength(0);
  });
});
