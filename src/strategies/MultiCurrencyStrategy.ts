import { Transaction } from '../models.js';
import { ExchangeRateService } from '../services/ExchangeRateService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class MultiCurrencyStrategy implements AuditStrategy {
  public readonly name = 'Multi-Currency Auditor';
  public readonly description =
    'Converts and aggregates transactions in a foreign currency';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
    // 1. call ExchangeRateService.getExchangeRates() asynchronously.
    const exchangeData = await ExchangeRateService.getExchangeRates();

    // 2. identify the target currency from `customParam` (default to 'eur' if invalid/not provided).
    let targetCurrency = 'EUR';
    if (customParam && customParam.toUpperCase() in exchangeData.rates) {
      targetCurrency = customParam.toUpperCase();
    }

    // 3. look up the exchange rate for the target currency (throw an error if not found in rates).
    const conversionRate = exchangeData.rates[targetCurrency];
    if (conversionRate === undefined) {
      throw new Error(`Exchange rate for ${targetCurrency} not found.`);
    }

    // 4 & 5. convert all transaction amounts and calculate totals.
    let totalIncomeUSD = 0;
    let totalExpensesUSD = 0;
    let totalIncomeTarget = 0;
    let totalExpensesTarget = 0;

    let transactionSummaries = '';

    for (const tx of transactions) {
      const amountTarget = tx.amount * conversionRate;
      const typeLabel = tx.amount >= 0 ? 'INCOME' : 'EXPENSE';

      if (tx.amount >= 0) {
        totalIncomeUSD += tx.amount;
        totalIncomeTarget += amountTarget;
      } else {
        totalExpensesUSD += Math.abs(tx.amount);
        totalExpensesTarget += Math.abs(amountTarget);
      }

      // use math.abs to ensure absolute values are displayed without negative signs
      transactionSummaries += `  - [${typeLabel}] ${tx.description}: $${Math.abs(tx.amount).toFixed(2)} USD -> ${Math.abs(amountTarget).toFixed(2)} ${targetCurrency}\n`;
    }

    const netBalanceUSD = totalIncomeUSD - totalExpensesUSD;
    const netBalanceTarget = totalIncomeTarget - totalExpensesTarget;

    // 6. format and return the text-based audit report.
    return `Multi-Currency Audit Report:
Target Currency: ${targetCurrency}
Conversion Rate (USD to ${targetCurrency}): ${conversionRate}

Total Income: $${totalIncomeUSD.toFixed(2)} USD / ${totalIncomeTarget.toFixed(2)} ${targetCurrency}
Total Expenses: $${totalExpensesUSD.toFixed(2)} USD / ${totalExpensesTarget.toFixed(2)} ${targetCurrency}
Net Balance: $${netBalanceUSD.toFixed(2)} USD / ${netBalanceTarget.toFixed(2)} ${targetCurrency}

Transaction Summaries:
${transactionSummaries || '  No transactions evaluated.'}==================================================`;
  }
}
