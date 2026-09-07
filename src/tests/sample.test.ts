import { describe, it, expect } from 'vitest';
import { REFERENCE_CLIENTS, REFERENCE_CARRY_FORWARD } from '@/domain/seed/referenceData';

describe('Baseline Seed Data Smoke Tests', () => {
  it('should preserve all four reference clients', () => {
    expect(REFERENCE_CLIENTS.length).toBe(4);
    const names = REFERENCE_CLIENTS.map((c) => c.name);
    expect(names).toContain('Sai');
    expect(names).toContain('Eshwar');
    expect(names).toContain('Ganesh');
    expect(names).toContain('Rohit');
  });

  it('should preserve the ₹500 business carry forward balance', () => {
    expect(REFERENCE_CARRY_FORWARD.amount).toBe('500.00');
    expect(REFERENCE_CARRY_FORWARD.fromPartner).toBe('ANURAG');
    expect(REFERENCE_CARRY_FORWARD.toPartner).toBe('VIVEK');
  });
});
