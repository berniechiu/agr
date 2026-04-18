import { describe, it, expect } from 'vitest';
import { MODEL_RATES, rateFor } from '../../src/scanner/pricing.js';

describe('rateFor', () => {
  it('returns rates for claude-opus-4-7', () => {
    expect(rateFor('claude-opus-4-7')).toEqual({
      in: 15, out: 75, cacheWrite: 18.75, cacheRead: 1.50,
    });
  });

  it('returns rates for claude-sonnet-4-6', () => {
    expect(rateFor('claude-sonnet-4-6')).toEqual({
      in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.30,
    });
  });

  it('returns rates for claude-haiku-4-5', () => {
    expect(rateFor('claude-haiku-4-5')).toEqual({
      in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.10,
    });
  });

  it('returns null for unknown model', () => {
    expect(rateFor('some-unknown-model')).toBeNull();
  });

  it('matches model ID ignoring trailing dated suffix', () => {
    expect(rateFor('claude-haiku-4-5-20251001')).toEqual({
      in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.10,
    });
  });

  it('MODEL_RATES is readonly map with all three families', () => {
    expect(Object.keys(MODEL_RATES).sort()).toEqual([
      'claude-haiku-4-5',
      'claude-opus-4-7',
      'claude-sonnet-4-6',
    ]);
  });
});
