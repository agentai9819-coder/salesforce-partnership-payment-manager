/**
 * Financial Precision Layer (Money)
 * Safe monetary arithmetic using integer paise (cents) internally to prevent floating-point anomalies.
 * Exposes exact decimal strings matching PostgreSQL NUMERIC(12, 2) specifications.
 */

export class Money {
  private readonly paise: bigint;

  private constructor(paise: bigint) {
    this.paise = paise;
  }

  /**
   * Creates a Money instance from standard currency string or number (e.g. "50000.00", 25000)
   */
  public static from(value: string | number | bigint): Money {
    if (typeof value === 'bigint') {
      return new Money(value);
    }
    const strVal = String(value).trim().replace(/,/g, '');
    if (!strVal || strVal === '') {
      return new Money(0n);
    }

    const isNegative = strVal.startsWith('-');
    const cleanStr = isNegative ? strVal.slice(1) : strVal;

    const parts = cleanStr.split('.');
    const integerPart = parts[0] || '0';
    let fractionPart = parts[1] || '0';

    if (fractionPart.length > 2) {
      fractionPart = fractionPart.slice(0, 2); // Truncate beyond 2 decimal places
    } else if (fractionPart.length === 1) {
      fractionPart += '0';
    } else if (fractionPart.length === 0) {
      fractionPart = '00';
    }

    const totalPaise = BigInt(integerPart) * 100n + BigInt(fractionPart);
    return new Money(isNegative ? -totalPaise : totalPaise);
  }

  public static zero(): Money {
    return new Money(0n);
  }

  public add(other: Money): Money {
    return new Money(this.paise + other.paise);
  }

  public subtract(other: Money): Money {
    return new Money(this.paise - other.paise);
  }

  public divideBy2(): Money {
    // Integer division by 2 with half-even or standard rounding
    const quotient = this.paise / 2n;
    const remainder = this.paise % 2n;
    if (remainder !== 0n && (remainder === 1n || remainder === -1n)) {
      // In financial split, handle 1 paisa precision conservatively
      return new Money(quotient);
    }
    return new Money(quotient);
  }

  public abs(): Money {
    return new Money(this.paise < 0n ? -this.paise : this.paise);
  }

  public isZero(): boolean {
    return this.paise === 0n;
  }

  public isPositive(): boolean {
    return this.paise > 0n;
  }

  public isNegative(): boolean {
    return this.paise < 0n;
  }

  public compareTo(other: Money): number {
    if (this.paise > other.paise) return 1;
    if (this.paise < other.paise) return -1;
    return 0;
  }

  public toPaise(): bigint {
    return this.paise;
  }

  /**
   * Formats as exact numeric string e.g. "50000.00" or "-2500.00"
   */
  public toNumericString(): string {
    const isNegative = this.paise < 0n;
    const absPaise = isNegative ? -this.paise : this.paise;
    const intPart = (absPaise / 100n).toString();
    const fracPart = (absPaise % 100n).toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}${intPart}.${fracPart}`;
  }

  /**
   * Formats in Indian Rupee format e.g. "₹50,000" or "₹1,10,000.50"
   */
  public toFormattedINR(includeDecimals = false): string {
    const num = Number(this.toNumericString());
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: includeDecimals ? 2 : 0,
      minimumFractionDigits: includeDecimals ? 2 : 0,
    }).format(num);
  }
}
