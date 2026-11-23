import { Money } from './money';
import Decimal from 'decimal.js';

export interface FxConversionResult {
  amount: Money;
  currency: string;
  baseCurrency: string;
  fxRate: Decimal;
  amountBase: Money;
}

/**
 * Converts a transaction amount into user base currency using a snapshot fxRate.
 * If currency equals baseCurrency, fxRate is strictly 1.
 */
export function convertToAmountBase(
  amount: Money,
  currency: string,
  baseCurrency: string,
  fxRate: number | string | Decimal = 1
): FxConversionResult {
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) {
    return {
      amount,
      currency: baseCurrency.toUpperCase(),
      baseCurrency: baseCurrency.toUpperCase(),
      fxRate: new Decimal(1),
      amountBase: amount,
    };
  }

  const rate = new Decimal(fxRate);
  if (rate.isZero() || rate.isNegative()) {
    throw new Error(`Invalid FX rate: ${rate.toString()}`);
  }

  const amountBase = amount.times(rate).round(4);

  return {
    amount,
    currency: currency.toUpperCase(),
    baseCurrency: baseCurrency.toUpperCase(),
    fxRate: rate,
    amountBase,
  };
}

