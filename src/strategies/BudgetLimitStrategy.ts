import { Transaction } from '../models.js';
import { BudgetService } from '../services/BudgetService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class BudgetLimitStrategy implements AuditStrategy {
  public readonly name = 'Budget Limit Auditor';
  public readonly description =
    'Checks category spending against monthly budget limits';

  public async execute(
    transactions: Transaction[],
    _customParam?: string,
  ): Promise<string> {
    // 1. Fetch category budget limits asynchronously.
    const budgets = await BudgetService.getCategoryBudgets();

    // 2. Group expense transactions (amount < 0) by category.
    const expensesByCategory = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      if (tx.amount < 0) {
        const list = expensesByCategory.get(tx.category) ?? [];
        list.push(tx);
        expensesByCategory.set(tx.category, list);
      }
    }

    // 3. Compute total spending per category.
    const totalsByCategory = new Map<string, number>();
    for (const [category, txs] of expensesByCategory.entries()) {
      const total = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      totalsByCategory.set(category, total);
    }

    // Collect every category we know about (budgeted or spent) for the summary.
    const allCategories = new Set<string>([
      ...Object.keys(budgets),
      ...totalsByCategory.keys(),
    ]);

    // 4. Determine which categories exceed their budget.
    interface Overage {
      category: string;
      limit: number;
      spent: number;
      overageAmount: number;
      overagePercent: number;
      transactions: Transaction[];
    }

    const overages: Overage[] = [];
    for (const category of allCategories) {
      const limit = budgets[category];
      const spent = totalsByCategory.get(category) ?? 0;

      if (limit === undefined) {
        continue; // No budget defined for this category; nothing to compare.
      }

      if (spent > limit) {
        const overageAmount = spent - limit;
        const overagePercent = (spent / limit) * 100;
        overages.push({
          category,
          limit,
          spent,
          overageAmount,
          overagePercent,
          transactions: expensesByCategory.get(category) ?? [],
        });
      }
    }

    // 5. Format the audit report.
    const lines: string[] = [];
    lines.push('BUDGET LIMIT AUDIT REPORT');
    lines.push('');

    // Summary section
    lines.push('SUMMARY');
    const sortedCategories = Array.from(allCategories).sort();
    for (const category of sortedCategories) {
      const limit = budgets[category];
      const spent = totalsByCategory.get(category) ?? 0;
      const limitStr =
        limit === undefined ? 'N/A' : `$${limit.toFixed(2)}`;
      lines.push(
        `  ${category}: Limit ${limitStr}, Spent $${spent.toFixed(2)}`,
      );
    }
    lines.push('');

    // Warnings section
    lines.push('OVER BUDGET WARNINGS');
    if (overages.length === 0) {
      lines.push('  No categories are over budget.');
    } else {
      for (const o of overages) {
        lines.push(
          `  ${o.category} is OVER BUDGET by $${o.overageAmount.toFixed(2)} ` +
            `(${o.overagePercent.toFixed(1)}% of limit, spent $${o.spent.toFixed(2)} of $${o.limit.toFixed(2)})`,
        );
      }
    }
    lines.push('');

    // Itemized transactions section
    lines.push('ITEMIZED OVER-BUDGET TRANSACTIONS');
    if (overages.length === 0) {
      lines.push('  None.');
    } else {
      for (const o of overages) {
        lines.push(`  ${o.category}:`);
        for (const tx of o.transactions) {
          lines.push(
            `    - ${tx.date} | ${tx.description} | $${Math.abs(tx.amount).toFixed(2)} (${tx.id})`,
          );
        }
      }
    }

    return lines.join('\n');
  }
}