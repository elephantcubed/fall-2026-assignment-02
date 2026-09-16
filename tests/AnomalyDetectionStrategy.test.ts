import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyDetectionStrategy } from '../src/strategies/AnomalyDetectionStrategy.js';
import { AnomalyRulesService } from '../src/services/AnomalyRulesService.js';
import { Transaction } from '../src/models.js';

describe('AnomalyDetectionStrategy (Feature 2)', () => {
  let strategy: AnomalyDetectionStrategy;

  beforeEach(() => {
    strategy = new AnomalyDetectionStrategy();
    vi.restoreAllMocks();
  });

  // Example of how to write and mock in your tests:
  //
  // it('should detect outlier transactions exceeding threshold', async () => {
  //   const mockRules = { maxTransactionAmount: 500.00, flaggedStatuses: ['flagged'] };
  //   const spy = vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);
  //
  //   const testTransactions: Transaction[] = [
  //     { id: '1', date: '2026-05-01', amount: -600.00, category: 'Shopping', description: 'Laptop', status: 'completed' }, // Outlier
  //     { id: '2', date: '2026-05-02', amount: -100.00, category: 'Food', description: 'Grocery', status: 'completed' }, // Normal
  //   ];
  //
  //   const result = await strategy.execute(testTransactions);
  //
  //   expect(spy).toHaveBeenCalled();
  //   expect(result).toContain('Laptop');
  //   expect(result).toContain('Outlier');
  // });
  const testTransactions: Transaction[] = [
    // Normal
    { id: '100', date: '2026-06-01', amount: -80.0, category: 'Food', description: 'Lunch', status: 'completed' },
    { id: '107', date: '2026-06-05', amount: -25.0, category: 'Food', description: 'Snack', status: 'completed' },
 
    // Outliers
    { id: '101', date: '2026-06-01', amount: -450.0, category: 'Travel', description: 'Flight', status: 'completed' },
    { id: '102', date: '2026-06-02', amount: 500.0, category: 'Income', description: 'Bonus', status: 'completed' }, // positive amount, abs value exceeds threshold
 
    // Duplicates
    { id: '103', date: '2026-06-03', amount: -12.5, category: 'Food', description: 'Coffee', status: 'completed' },
    { id: '104', date: '2026-06-03', amount: -12.5, category: 'Food', description: 'Coffee', status: 'completed' },
 
    // Flagged
    { id: '105', date: '2026-06-04', amount: -60.0, category: 'Misc', description: 'Subscription', status: 'flagged' },
    { id: '106', date: '2026-06-04', amount: -90.0, category: 'Misc', description: 'Membership', status: 'review' },
  ];
 
  const mockRules = { maxTransactionAmount: 300.0, flaggedStatuses: ['flagged', 'review'] };
 
  beforeEach(() => {
    strategy = new AnomalyDetectionStrategy();
    vi.restoreAllMocks();
    vi.spyOn(AnomalyRulesService, 'getRules').mockResolvedValue(mockRules);
  });
 
  it('should detect outlier transactions exceeding the configured max amount limit', async () => {
    const result = await strategy.execute(testTransactions);
 
    expect(AnomalyRulesService.getRules).toHaveBeenCalled();
    expect(result).toContain('Outliers (more than $300)');
    expect(result).toContain('Flight');
    expect(result).toContain('Bonus'); 
    expect(result).not.toContain('Lunch');
    expect(result).not.toContain('Snack');
  });
 
  it('should identify duplicate transactions sharing identical date, amount, category, and description', async () => {
    const result = await strategy.execute(testTransactions);
 
    expect(result).toContain('Set 1:');
    expect(result).toContain('Coffee');
    expect(result).not.toContain('Set 2:');
  });
 
  it('should flag transactions matching standard flagged statuses in the rules', async () => {
    const result = await strategy.execute(testTransactions);
 
    expect(result).toContain('Flagged Transactions (status: flagged, review)');
    expect(result).toContain('Subscription');
    expect(result).toContain('Membership');
  });
 
  it('should calculate correct transaction anomaly rates and total flagged valuation', async () => {
    const result = await strategy.execute(testTransactions);
 
    expect(result).toContain('Anomalous Transactions: 6 / 8');
    expect(result).toContain('Anomaly Rate: 75.00%');
 
    expect(result).toContain('Total Flagged Value: $150.00');
  });
 
  it('should output a clean, readable text audit report detailing warnings', async () => {
    const result = await strategy.execute(testTransactions);
 
    expect(result).toContain('Auditing Report');
    expect(result).toContain('Outliers (more than $300)');
    expect(result).toContain('Duplicates');
    expect(result).toContain('Flagged Transactions');
    expect(result).toContain('Summary');
    expect(typeof result).toBe('string');
  });
 
  it('should handle empty transaction lists gracefully', async () => {
    const result = await strategy.execute([]);
 
    expect(result).toContain('Total Transactions: 0');
    expect(result).toContain('Anomalous Transactions: 0 / 0');
    expect(result).toContain('Anomaly Rate: 0.00%');
    expect(result).toContain('None found.');
  });
});

