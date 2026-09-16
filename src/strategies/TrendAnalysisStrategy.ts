import { Transaction } from '../models.js';
import { HistoricalDataService } from '../services/HistoricalDataService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class TrendAnalysisStrategy implements AuditStrategy {
  public readonly name = 'Historical Trend Auditor';
  public readonly description =
    'Compares current monthly category spending against historical averages';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
        const historical = await HistoricalDataService.getHistoricalAverages();
        const VARIANCE_THRESHOLD = 20;

    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0) {
        totals[t.category] = (totals[t.category] ?? 0) + Math.abs(t.amount);
      }
    }

    const categories = Object.keys(totals).sort();

    if (categories.length === 0) {
      return '=== Historical Trend Auditor Report ===\n\nNo expense transactions found for this period.';
    }

    const rows: string[] = [
      'Category            Current       Historical    % Change',
      '---------------------------------------------------------',
    ];
    const growth: string[] = [];
    const savings: string[] = [];

    for (const category of categories) {
      const current = totals[category];
      const avg = historical[category];
      const currentStr = `$${current.toFixed(2)}`;

      if (avg === undefined) {
        rows.push(`${category.padEnd(20)}${currentStr.padEnd(14)}N/A           N/A`);
        continue;
      }

      const variance = ((current - avg) / avg) * 100;
      const sign = variance >= 0 ? '+' : '';
      const avgStr = `$${avg.toFixed(2)}`;
      const varStr = `${sign}${variance.toFixed(2)}%`;

      rows.push(`${category.padEnd(20)}${currentStr.padEnd(14)}${avgStr.padEnd(14)}${varStr}`);

      const detail = `  - ${category}: ${varStr} (${currentStr} vs ${avgStr} average)`;
      if (variance > VARIANCE_THRESHOLD) growth.push(detail);
      if (variance < -VARIANCE_THRESHOLD) savings.push(detail);
    }

    return [
      '=== Historical Trend Auditor Report ===',
      '',
      'Category Comparison (Current vs. Historical Average):',
      ...rows,
      '',
      `Significant Growth Categories (> +${VARIANCE_THRESHOLD}%):`,
      growth.length ? growth.join('\n') : '  None',
      '',
      `Significant Savings Categories (< -${VARIANCE_THRESHOLD}%):`,
      savings.length ? savings.join('\n') : '  None',
    ].join('\n');
  
  }
}
