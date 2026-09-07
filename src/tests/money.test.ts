import { describe, it, expect } from 'vitest';
import { Money } from '@/domain/precision/money';

describe('Money Financial Precision Unit Tests', () => {
  it('should initialize correctly from string, number, and zero', () => {
    expect(Money.from('50000.00').toNumericString()).toBe('50000.00');
    expect(Money.from(25000).toNumericString()).toBe('25000.00');
    expect(Money.zero().toNumericString()).toBe('0.00');
  });

  it('should avoid floating-point drift on fractional calculations', () => {
    // 0.10 + 0.20 must equal 0.30 exactly, not 0.30000000000000004
    const m1 = Money.from('0.10');
    const m2 = Money.from('0.20');
    const sum = m1.add(m2);
    expect(sum.toNumericString()).toBe('0.30');
  });

  it('should accurately compute partnership 50% split', () => {
    const netPool = Money.from('35000.00');
    const half = netPool.divideBy2();
    expect(half.toNumericString()).toBe('17500.00');
  });

  it('should accurately handle negative liquid cash positions', () => {
    const collected = Money.from('0.00');
    const disbursed = Money.from('10000.00');
    const cashHeld = collected.subtract(disbursed);
    expect(cashHeld.isNegative()).toBe(true);
    expect(cashHeld.toNumericString()).toBe('-10000.00');
  });

  it('should correctly calculate the September settlement equation', () => {
    // Vivek cash: ₹20,000; Entitlement: ₹17,500
    const vivekCash = Money.from('20000.00');
    const entitlement = Money.from('17500.00');
    const operationalBalancing = vivekCash.subtract(entitlement);
    expect(operationalBalancing.toNumericString()).toBe('2500.00');

    // Carry-forward adjustment: Anurag owes Vivek ₹500
    const carryForward = Money.from('500.00');
    const finalTransfer = operationalBalancing.subtract(carryForward);
    expect(finalTransfer.toNumericString()).toBe('2000.00');
  });

  it('should format into Indian Rupee presentation format', () => {
    const amount = Money.from('50000.00');
    const formatted = amount.toFormattedINR(false);
    expect(formatted).toContain('50,000');
  });
});
