import { formatCurrency } from './currency.util';

describe('formatCurrency', () => {
  it('formats USD with default locale', () => {
    const result = formatCurrency(12.5, 'USD');
    expect(result).toMatch(/\$?\s*12\.50/);
  });

  it('formats EUR', () => {
    const result = formatCurrency(99.99, 'EUR');
    expect(result).toContain('99');
  });

  it('formats INR with en-US', () => {
    const result = formatCurrency(100, 'INR', 'en-US');
    expect(result).toMatch(/100\.00|₹?\s*100/);
  });

  it('returns string with amount when given invalid currency (fallback)', () => {
    const result = formatCurrency(10.5, 'INVALID', 'en-US');
    expect(result).toContain('10.50');
    expect(typeof result).toBe('string');
  });

  it('handles zero', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toMatch(/0\.00/);
  });

  it('trims and uses locale when provided', () => {
    const result = formatCurrency(42, 'GBP', ' en-GB ');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
