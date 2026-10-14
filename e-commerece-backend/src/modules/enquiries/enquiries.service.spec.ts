import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { EnquiriesService } from './enquiries.service.js';
import type { CreateEnquiryDto } from './dto/enquiry.dto.js';

const NOW = new Date('2026-10-14T03:00:00.000Z');

function setup() {
  const create = vi.fn().mockResolvedValue({});
  const service = new EnquiriesService({ enquiry: { create } } as unknown as PrismaService);
  return { service, create };
}

const dto = (extra: Partial<CreateEnquiryDto> = {}) =>
  ({ name: 'Ayesha Khan', phone: '0400 111 222', ...extra }) as CreateEnquiryDto;

describe('EnquiriesService.create', () => {
  it('saves the enquiry with defaults for the optional parts', async () => {
    const { service, create } = setup();
    await expect(service.create(dto(), NOW)).resolves.toEqual({ received: true });
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Ayesha Khan',
        phone: '0400 111 222',
        email: null,
        budget: null,
        eventDate: null,
        outfitTypes: [],
        message: null,
        source: 'website',
      },
    });
  });

  it('stores the event date, removes duplicate outfit types and lowercases the source', async () => {
    const { service, create } = setup();
    await service.create(
      dto({ eventDate: '2026-12-05', outfitTypes: ['LEHENGA', 'LEHENGA', 'GHARARA'], source: 'Window' }),
      NOW,
    );
    const data = create.mock.calls[0][0].data;
    expect(data.eventDate.toISOString()).toBe('2026-12-05T00:00:00.000Z');
    expect(data.outfitTypes).toEqual(['LEHENGA', 'GHARARA']);
    expect(data.source).toBe('window');
  });

  it('accepts today, and rejects a date that has already passed', async () => {
    const { service, create } = setup();
    await service.create(dto({ eventDate: '2026-10-14' }), NOW);
    expect(create).toHaveBeenCalledTimes(1);
    await expect(service.create(dto({ eventDate: '2026-09-01' }), NOW)).rejects.toThrow(
      new BadRequestException('Please choose a date that has not passed'),
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('pretends to work but saves nothing when the hidden robot box is filled', async () => {
    const { service, create } = setup();
    await expect(service.create(dto({ website: 'http://spam.example' }), NOW)).resolves.toEqual({
      received: true,
    });
    expect(create).not.toHaveBeenCalled();
  });
});
