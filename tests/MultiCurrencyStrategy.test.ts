import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiCurrencyStrategy } from '../src/strategies/MultiCurrencyStrategy.js';
import { ExchangeRateService } from '../src/services/ExchangeRateService.js';
import { Transaction } from '../src/models.js';

describe('MultiCurrencyStrategy (Feature 5)', () => {
  let strategy: MultiCurrencyStrategy;

  // reusable mock data
  const mockExchangeRates = {
    base: 'USD',
    rates: {
      EUR: 0.9,
      GBP: 0.75,
      JPY: 150.0,
    },
  };

  // updated to match real data: expenses use negative amounts instead of a type property
  const testTransactions: Transaction[] = [
    {
      id: '1',
      date: '2026-05-01',
      amount: 100.0,
      category: 'Salary',
      description: 'Gig',
      status: 'completed',
    },
    {
      id: '2',
      date: '2026-05-02',
      amount: -40.0,
      category: 'Food',
      description: 'Grocery',
      status: 'completed',
    },
  ];

  beforeEach(() => {
    strategy = new MultiCurrencyStrategy();
    vi.restoreAllMocks();
  });

  it('should parse exchange rates and use customParam target currency', async () => {
    const spy = vi
      .spyOn(ExchangeRateService, 'getExchangeRates')
      .mockResolvedValue(mockExchangeRates);

    const result = await strategy.execute(testTransactions, 'GBP');

    expect(spy).toHaveBeenCalled();
    expect(result).toContain('Target Currency: GBP');
    expect(result).toContain('Conversion Rate (USD to GBP): 0.75');
  });

  it('should default to EUR conversion if currency param is missing or invalid', async () => {
    vi.spyOn(ExchangeRateService, 'getExchangeRates').mockResolvedValue(
      mockExchangeRates,
    );

    // test missing parameter
    const resultMissingParam = await strategy.execute(testTransactions);
    expect(resultMissingParam).toContain('Target Currency: EUR');

    // test invalid parameter not found in rates
    const resultInvalidParam = await strategy.execute(testTransactions, 'XYZ');
    expect(resultInvalidParam).toContain('Target Currency: EUR');
  });

  it('should throw an error if the target currency does not exist in exchange rates', async () => {
    // provide exchange rates that are completely missing eur (the default fallback)
    vi.spyOn(ExchangeRateService, 'getExchangeRates').mockResolvedValue({
      base: 'USD',
      rates: { GBP: 0.75 },
    });

    // passes 'xyz', falls back to 'eur'. fails because 'eur' isn't in mocked rates.
    await expect(strategy.execute(testTransactions, 'XYZ')).rejects.toThrow(
      'Exchange rate for EUR not found.',
    );
  });

  it('should accurately convert individual transaction amounts to the target currency', async () => {
    vi.spyOn(ExchangeRateService, 'getExchangeRates').mockResolvedValue(
      mockExchangeRates,
    );

    const result = await strategy.execute(testTransactions, 'JPY');

    // 100 usd * 150 = 15000 jpy
    expect(result).toContain('- [INCOME] Gig: $100.00 USD -> 15000.00 JPY');
    // 40 usd * 150 = 6000 jpy
    expect(result).toContain('- [EXPENSE] Grocery: $40.00 USD -> 6000.00 JPY');
  });

  it('should calculate and display totals (income, expense, net balance) in both USD and target currency', async () => {
    vi.spyOn(ExchangeRateService, 'getExchangeRates').mockResolvedValue(
      mockExchangeRates,
    );

    const result = await strategy.execute(testTransactions, 'EUR');

    // expected usd: income $100, expense $40, net $60
    // expected eur (0.9 rate): income €90, expense €36, net €54
    expect(result).toContain('Total Income: $100.00 USD / 90.00 EUR');
    expect(result).toContain('Total Expenses: $40.00 USD / 36.00 EUR');
    expect(result).toContain('Net Balance: $60.00 USD / 54.00 EUR');
  });
});
