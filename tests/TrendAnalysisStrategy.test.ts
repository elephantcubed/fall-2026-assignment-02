import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrendAnalysisStrategy } from '../src/strategies/TrendAnalysisStrategy.js';
import { HistoricalDataService } from '../src/services/HistoricalDataService.js';
import { Transaction } from '../src/models.js';

describe('TrendAnalysisStrategy (Feature 3)', () => {
  let strategy: TrendAnalysisStrategy;

  beforeEach(() => {
    strategy = new TrendAnalysisStrategy();
    vi.restoreAllMocks();
  });

 it('should group current expenses by category and compute accurate totals', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 200,
    });

    const testTransactions: Transaction[] = [
      { id: '1', date: '2026-05-01', amount: -50, category: 'Food', description: 'Groceries', status: 'completed' },
      { id: '2', date: '2026-05-02', amount: -30, category: 'Food', description: 'Dinner out', status: 'completed' },
      { id: '3', date: '2026-05-03', amount: 2500, category: 'Salary', description: 'Paycheck', status: 'completed' },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Food');
    expect(result).toContain('$80.00');
    expect(result).not.toContain('Salary');
  });

  it('should calculate variance percentage from historical averages correctly', async () => {
    const spy = vi
      .spyOn(HistoricalDataService, 'getHistoricalAverages')
      .mockResolvedValue({ Food: 200, Rent: 1000 });

    const testTransactions: Transaction[] = [
      { id: '1', date: '2026-05-01', amount: -250.0, category: 'Food', description: 'Grocery', status: 'completed' },
      { id: '2', date: '2026-05-02', amount: -1000.0, category: 'Rent', description: 'Apartment', status: 'completed' },
    ];

    const result = await strategy.execute(testTransactions);

    expect(spy).toHaveBeenCalled();
    expect(result).toContain('+25.00%');
    expect(result).toContain('+0.00%');
  });

  it('should highlight categories exceeding positive/negative 20% variance threshold', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Business: 400,
      Transport: 100,
      Utilities: 100,
    });

    const testTransactions: Transaction[] = [
      { id: '1', date: '2026-05-01', amount: -500, category: 'Business', description: 'Conference', status: 'completed' },
      { id: '2', date: '2026-05-02', amount: -50, category: 'Transport', description: 'Gas', status: 'completed' },
      { id: '3', date: '2026-05-03', amount: -110, category: 'Utilities', description: 'Electric bill', status: 'completed' },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Significant Growth Categories');
    expect(result).toContain('Business');
    expect(result).toContain('Significant Savings Categories');
    expect(result).toContain('Transport');

    const growthSection = result.split('Significant Growth Categories')[1].split('Significant Savings Categories')[0];
    const savingsSection = result.split('Significant Savings Categories')[1];
    expect(growthSection).not.toContain('Utilities');
    expect(savingsSection).not.toContain('Utilities');
  });

  it('should handle categories present in current data but missing in historical benchmarks', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({});

    const testTransactions: Transaction[] = [
      { id: '1', date: '2026-05-01', amount: -75, category: 'Hobbies', description: 'Board game', status: 'completed' },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Hobbies');
    expect(result).toContain('N/A');
  });

  it('should format historical vs current comparisons in a readable report', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 200,
    });

    const testTransactions: Transaction[] = [
      { id: '1', date: '2026-05-01', amount: -250, category: 'Food', description: 'Grocery', status: 'completed' },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Historical Trend Auditor Report');
    expect(result).toContain('Category');
    expect(result).toContain('Current');
    expect(result).toContain('Historical');
    expect(result).toContain('% Change');
  });

  it('should return a "no expenses" message and not crash when given an empty transaction list', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({});

    const result = await strategy.execute([]);

    expect(result).toContain('No expense transactions found');
  });
});
