import { Transaction } from '../models.js';
import { AnomalyRulesService } from '../services/AnomalyRulesService.js';
import { HistoricalDataService } from '../services/HistoricalDataService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class AnomalyDetectionStrategy implements AuditStrategy {
  public readonly name = 'Anomaly & Duplicate Auditor';
  public readonly description =
    'Detects transactions exceeding thresholds and duplicate records';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {

    // 1. Call AnomalyRulesService.getRules() asynchronously.
    const rules = await AnomalyRulesService.getRules();

    // 2. Scan transactions to find outliers (expenses exceeding rules.maxTransactionAmount).
    const outliers = transactions.filter((t) => Math.abs(t.amount) > rules.maxTransactionAmount);

    // 3. Scan to identify duplicates (transactions sharing the exact same date, category, description, and amount).
    const groups = new Map<string, Transaction[]>();
    for (const tr of transactions) {
      const key = `${tr.date}|${tr.category}|${tr.amount}|${tr.description}`;
      if (groups.has(key)) {
        groups.get(key)?.push(tr);
      }
      else {
        groups.set(key, [tr]);
      }
    }
    
    const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
    // 4. Identify transactions having a status that matches any in rules.flaggedStatuses.
    hey guys im testing something out here'

    // 5. Calculate total flagged value and anomaly rates.


    // 6. Format and return a text-based audit report of anomalies, duplicate sets, and totals.


  }
}
