import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetLimitStrategy } from '../src/strategies/BudgetLimitStrategy.js';
import { BudgetService } from '../src/services/BudgetService.js';
import { Transaction } from '../src/models.js';

describe('BudgetLimitStrategy (Feature 1)', () => {
  let strategy: BudgetLimitStrategy;

  beforeEach(() => {
    strategy = new BudgetLimitStrategy();
    vi.restoreAllMocks();
  });

  // Example of how to write and mock in your tests:
  //
  // it('should correctly identify categories that are over budget', async () => {
  //   // 1. Mock the BudgetService asynchronously
  //   const mockBudgets = { Food: 100, Rent: 1000 };
  //   const spy = vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);
  //
  //   // 2. Set up test transactions
  //   const testTransactions: Transaction[] = [
  //     { id: '1', date: '2026-05-01', amount: -150.00, category: 'Food', description: 'Grocery', status: 'completed' }, // Over budget
  //     { id: '2', date: '2026-05-02', amount: -900.00, category: 'Rent', description: 'Apartment', status: 'completed' }, // Under budget
  //   ];
  //
  //   // 3. Execute
  //   const result = await strategy.execute(testTransactions);
  //
  //   // 4. Assert
  //   expect(spy).toHaveBeenCalled();
  //   expect(result).toContain('Food');
  //   expect(result).toContain('OVER BUDGET'); // or whatever formatting you choose
  //   expect(result).not.toContain('Rent over budget');
  // });

  it('should group expenses correctly by category and sum them', async () => {
    const mockBudgets = { Food: 500, Rent: 2000 };
    const spy = vi
      .spyOn(BudgetService, 'getCategoryBudgets')
      .mockResolvedValue(mockBudgets);

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -50,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -25,
        category: 'Food',
        description: 'Takeout',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: 2000, // income, should be ignored
        category: 'Food',
        description: 'Refund',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(spy).toHaveBeenCalledTimes(1);
    // Food spending should be summed to 75.00, ignoring the positive amount
    expect(result).toContain('Food: Limit $500.00, Spent $75.00');
  });

  it('should calculate absolute overage amounts and percentage exceeded', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 100,
      Rent: 1000,
    });

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -150.0,
        category: 'Food',
        description: 'Grocery',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -900.0,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    // Food: spent 150 of 100 -> overage 50.00, 150.0%
    expect(result).toContain('Food is OVER BUDGET by $50.00');
    expect(result).toContain('150.0% of limit');
    // Rent is under budget, should not be flagged
    expect(result).not.toContain('Rent is OVER BUDGET');
  });

  it('should list the specific transactions contributing to categories that are over budget', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 50,
    });

    const testTransactions: Transaction[] = [
      {
        id: 'tx-a',
        date: '2026-05-01',
        amount: -40.0,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: 'tx-b',
        date: '2026-05-02',
        amount: -30.0,
        category: 'Food',
        description: 'Restaurant',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Groceries');
    expect(result).toContain('tx-a');
    expect(result).toContain('Restaurant');
    expect(result).toContain('tx-b');
  });

  it('should handle scenarios where no categories are over budget', async () => {
    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue({
      Food: 500,
      Rent: 2000,
    });

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -100.0,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('No categories are over budget.');
    expect(result).toContain('None.');
  });

  it('should handle empty transaction list gracefully', async () => {
    const spy = vi
      .spyOn(BudgetService, 'getCategoryBudgets')
      .mockResolvedValue({ Food: 500 });

    const result = await strategy.execute([]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toContain('Food: Limit $500.00, Spent $0.00');
    expect(result).toContain('No categories are over budget.');
    expect(() => result).not.toThrow();
  });
});