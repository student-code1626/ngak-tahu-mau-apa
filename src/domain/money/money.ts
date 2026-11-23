import Decimal from 'decimal.js';

// Configure Decimal for financial precision: 20 digits precision, HALF_UP rounding
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  private readonly value: Decimal;

  constructor(amount: string | number | Decimal | Money) {
    if (amount instanceof Money) {
      this.value = amount.value;
    } else if (amount instanceof Decimal) {
      this.value = amount;
    } else {
      this.value = new Decimal(amount || 0);
    }
  }

  static from(amount: string | number | Decimal | Money): Money {
    return new Money(amount);
  }

  static zero(): Money {
    return new Money(0);
  }

  get raw(): Decimal {
    return this.value;
  }

  plus(other: Money | Decimal | string | number): Money {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.plus(o));
  }

  minus(other: Money | Decimal | string | number): Money {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.minus(o));
  }

  times(other: Decimal | string | number): Money {
    const factor = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.times(factor));
  }

  dividedBy(other: Decimal | string | number): Money {
    const divisor = other instanceof Money ? other.value : new Decimal(other);
    if (divisor.isZero()) {
      throw new Error('Division by zero in Money calculation');
    }
    return new Money(this.value.dividedBy(divisor));
  }

  abs(): Money {
    return new Money(this.value.abs());
  }

  negated(): Money {
    return new Money(this.value.negated());
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  equals(other: Money | Decimal | string | number): boolean {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return this.value.equals(o);
  }

  greaterThan(other: Money | Decimal | string | number): boolean {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return this.value.greaterThan(o);
  }

  greaterThanOrEqualTo(other: Money | Decimal | string | number): boolean {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return this.value.greaterThanOrEqualTo(o);
  }

  lessThan(other: Money | Decimal | string | number): boolean {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return this.value.lessThan(o);
  }

  lessThanOrEqualTo(other: Money | Decimal | string | number): boolean {
    const o = other instanceof Money ? other.value : new Decimal(other);
    return this.value.lessThanOrEqualTo(o);
  }

  round(decimalPlaces = 2): Money {
    return new Money(this.value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP));
  }

  toFloor(): Money {
    return new Money(this.value.floor());
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  toString(): string {
    return this.value.toString();
  }

  toFixed(decimalPlaces = 2): string {
    return this.value.toFixed(decimalPlaces);
  }

  format(currency = 'IDR'): string {
    const num = this.value.toNumber();
    if (currency === 'IDR') {
      return `Rp ${num.toLocaleString('id-ID')}`;
    }
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

