import { describe, expect, it } from 'vitest';
import { ratingSummary, reviewerName } from './review-rules.js';

describe('reviewerName', () => {
  it('shows first name and the first letter of the surname', () => {
    expect(reviewerName('Ayesha', 'khan')).toBe('Ayesha K.');
  });
  it('falls back when names are missing', () => {
    expect(reviewerName('Ayesha', null)).toBe('Ayesha');
    expect(reviewerName(null, 'Khan')).toBe('Customer');
    expect(reviewerName('  ', '  ')).toBe('Customer');
  });
});

describe('ratingSummary', () => {
  it('rounds the average to one decimal', () => {
    expect(ratingSummary(3, 14)).toEqual({ count: 3, average: 4.7 });
    expect(ratingSummary(2, 9)).toEqual({ count: 2, average: 4.5 });
  });
  it('has no average without ratings', () => {
    expect(ratingSummary(0, 0)).toEqual({ count: 0, average: null });
  });
});
