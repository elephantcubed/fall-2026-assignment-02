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
    const flagged = transactions.filter((t) => rules.flaggedStatuses.includes(t.status));
 
    // 5. Calculate total flagged value and anomaly rates.
    const anomalyId = new Set<string>();
    outliers.forEach((tr) => anomalyId.add(tr.id));
    flagged.forEach((tr) => anomalyId.add(tr.id));
    duplicateGroups.flat().forEach((tr) => anomalyId.add(tr.id));
 
    const anomalyCount = anomalyId.size;
    const totalCount = transactions.length;
    const anomalyRate = totalCount > 0 ? (anomalyCount / totalCount) * 100 : 0;
 
    const flaggedTotal = flagged.reduce((sum, t) => sum + Math.abs(t.amount), 0);
 
    // 6. Format and return a text-based audit report of anomalies, duplicate sets, and totals.
    const line = (t: Transaction) => `- ${t.date} | ${t.category} | ${t.description} | $${t.amount.toFixed(2)}`;
 
    // Added: empty-list fallback so the report doesn't just print a blank line when nothing is found.
    const out = outliers.length > 0 ? outliers.map(line).join("\n") : "  None found.";
    const dupe = duplicateGroups.length > 0 ? duplicateGroups.map((g, i) => `  Set ${i + 1}:\n` + g.map(line).join('\n')).join('\n') : "  None found.";
    const flag = flagged.length > 0 ? flagged.map(line).join("\n") : "  None found.";


    const auditReport: string = [
      "Audit Report",
      "###################",
      `Total Transactions: ${transactions.length}`,
      " ",
      `Outliers (more than $${rules.maxTransactionAmount})`,
      out,
      " ",
      "Duplicates",
      dupe,
      " ",
      `Flagged Transactions (status: ${rules.flaggedStatuses.join(', ')})`,
      flag,
      " ",
      "Summary",
      `  Anomalous Transactions: ${anomalyCount} / ${totalCount}`,
      `  Anomaly Rate: ${anomalyRate.toFixed(2)}%`,
      `  Total Flagged Value: $${flaggedTotal.toFixed(2)}`,
    ].join("\n");
 
    return auditReport;
  }
}
 

