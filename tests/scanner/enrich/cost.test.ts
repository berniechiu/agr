import { describe, it, expect } from 'vitest';
import { estimateCost } from '../../../src/scanner/enrich/cost.js';

function assistantWithUsage(model: string, usage: Record<string, number>): Record<string, unknown> {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      model,
      content: [{ type: 'text', text: 'ok' }],
      usage,
    },
  };
}

describe('estimateCost', () => {
  it('returns null usd and zero tokens for empty input', () => {
    expect(estimateCost([])).toEqual({ usd: null, tokensIn: 0, tokensOut: 0 });
  });

  it('returns null usd when no usage blocks present', () => {
    const result = estimateCost([
      { type: 'user', message: { content: 'hi' } },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } },
    ]);
    expect(result).toEqual({ usd: null, tokensIn: 0, tokensOut: 0 });
  });

  it('computes cost for a single Sonnet turn', () => {
    const result = estimateCost([
      assistantWithUsage('claude-sonnet-4-6', {
        input_tokens: 1_000_000,
        output_tokens: 500_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
    ]);
    expect(result.usd).toBeCloseTo(10.50, 4);
    expect(result.tokensIn).toBe(1_000_000);
    expect(result.tokensOut).toBe(500_000);
  });

  it('includes cache tokens in tokensIn and prices them correctly', () => {
    const result = estimateCost([
      assistantWithUsage('claude-sonnet-4-6', {
        input_tokens: 100_000,
        output_tokens: 50_000,
        cache_creation_input_tokens: 200_000,
        cache_read_input_tokens: 500_000,
      }),
    ]);
    expect(result.usd).toBeCloseTo(1.95, 4);
    expect(result.tokensIn).toBe(800_000);
    expect(result.tokensOut).toBe(50_000);
  });

  it('sums costs across mixed models', () => {
    const result = estimateCost([
      assistantWithUsage('claude-opus-4-7', {
        input_tokens: 1_000_000,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
      assistantWithUsage('claude-haiku-4-5', {
        input_tokens: 1_000_000,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
    ]);
    expect(result.usd).toBeCloseTo(16, 4);
    expect(result.tokensIn).toBe(2_000_000);
  });

  it('returns null usd when every turn has an unknown model', () => {
    const result = estimateCost([
      assistantWithUsage('some-unknown-model', {
        input_tokens: 1_000_000,
        output_tokens: 500_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
    ]);
    expect(result.usd).toBeNull();
    expect(result.tokensIn).toBe(1_000_000);
    expect(result.tokensOut).toBe(500_000);
  });

  it('contributes 0 for unknown turns when mixed with known turns', () => {
    const result = estimateCost([
      assistantWithUsage('claude-sonnet-4-6', {
        input_tokens: 1_000_000,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
      assistantWithUsage('weird-model', {
        input_tokens: 5_000_000,
        output_tokens: 5_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }),
    ]);
    expect(result.usd).toBeCloseTo(3, 4);
  });

  it('treats missing usage fields as 0', () => {
    const result = estimateCost([
      assistantWithUsage('claude-sonnet-4-6', { input_tokens: 1_000_000 } as Record<string, number>),
    ]);
    expect(result.usd).toBeCloseTo(3, 4);
    expect(result.tokensOut).toBe(0);
  });
});
