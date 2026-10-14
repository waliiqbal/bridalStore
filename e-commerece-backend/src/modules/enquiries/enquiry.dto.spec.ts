import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateEnquiryDto } from './dto/enquiry.dto.js';

const valid = {
  name: 'Ayesha Khan',
  phone: '+61 400 111 222',
  email: 'ayesha@example.com',
  budget: '1000_2000',
  eventDate: '2099-03-14',
  outfitTypes: ['LEHENGA', 'GHARARA'],
  message: 'Looking for a Barat lehenga.',
  source: 'window',
};

// The messages the customer sees are the validation messages, so check which field fails.
async function failures(body: object) {
  const dto = plainToInstance(CreateEnquiryDto, { ...valid, ...body });
  return (await validate(dto)).map((e) => e.property);
}

describe('CreateEnquiryDto', () => {
  it('accepts a full form', async () => {
    expect(await failures({})).toEqual([]);
  });

  it('only needs a name and phone, and treats empty boxes as not filled in', async () => {
    const dto = plainToInstance(CreateEnquiryDto, {
      name: ' Sara ',
      phone: '0400 222 333',
      email: '',
      budget: '',
      eventDate: '',
      message: '   ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ name: 'Sara', email: null, budget: null, eventDate: null, message: null });
  });

  it.each([
    ['name', { name: '' }],
    ['name', { name: 'A' }],
    ['phone', { phone: 'abc' }],
    ['phone', { phone: '12' }],
    ['email', { email: 'nope' }],
    ['budget', { budget: 'MILLIONS' }],
    ['outfitTypes', { outfitTypes: ['SPACESUIT'] }],
    ['outfitTypes', { outfitTypes: 'LEHENGA' }],
    ['eventDate', { eventDate: '2099-02-31' }],
    ['eventDate', { eventDate: '14/03/2099' }],
    ['source', { source: 'a b<script>' }],
    ['message', { message: 'x'.repeat(2001) }],
  ])('rejects a bad %s', async (field, body) => {
    expect(await failures(body)).toContain(field);
  });
});
