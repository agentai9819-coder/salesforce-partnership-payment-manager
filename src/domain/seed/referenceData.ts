/**
 * Preserved Reference & Demo Data
 * Sourced directly from the initial single-file prototype (salesforce-partnership-app/index.html).
 * 
 * IMPORTANT:
 * This data serves as the baseline for testing and development seeding only.
 * It must NOT be treated as permanent, hardcoded business logic in the production application.
 */

export interface ReferenceClientData {
  id: string;
  name: string;
  initialBillingRule: string;
  note: string;
  exampleBilling: {
    august2026?: string;
    september2026?: string;
  };
  externalObligations?: {
    partyName: string;
    partyType: 'RESOURCE' | 'BROKER';
    amount: string;
  };
}

export interface ReferencePaymentData {
  id: string;
  date: string;
  clientId: string;
  amountReceived: string;
  externalPaid: string;
  collectedBy: 'ANURAG' | 'VIVEK';
  disbursedBy?: 'ANURAG' | 'VIVEK';
  note: string;
}

export interface ReferenceCarryForward {
  fromPartner: 'ANURAG';
  toPartner: 'VIVEK';
  amount: string;
  reason: string;
}

export const REFERENCE_PARTNERS = [
  { id: 'partner-anurag', code: 'ANURAG' as const, name: 'Anurag', share: 50 },
  { id: 'partner-vivek', code: 'VIVEK' as const, name: 'Vivek', share: 50 },
];

export const REFERENCE_CLIENTS: ReferenceClientData[] = [
  {
    id: 'sai',
    name: 'Sai',
    initialBillingRule: '₹40,000 Aug; ₹50,000 Sep',
    note: 'Payment every 15 days',
    exampleBilling: {
      august2026: '40000.00',
      september2026: '50000.00',
    },
  },
  {
    id: 'eshwar',
    name: 'Eshwar',
    initialBillingRule: '₹50,000 total; ₹20,000 resource',
    note: 'Remaining ₹30,000 is 50–50',
    exampleBilling: {
      september2026: '50000.00',
    },
    externalObligations: {
      partyName: 'External Resource',
      partyType: 'RESOURCE',
      amount: '20000.00',
    },
  },
  {
    id: 'ganesh',
    name: 'Ganesh',
    initialBillingRule: '₹70,000 total; ₹40,000 Mokika',
    note: 'Remaining ₹30,000 is 50–50. Project started Sep, billing not started yet.',
    exampleBilling: {
      september2026: '70000.00',
    },
    externalObligations: {
      partyName: 'Mokika',
      partyType: 'RESOURCE',
      amount: '40000.00',
    },
  },
  {
    id: 'rohit',
    name: 'Rohit',
    initialBillingRule: '₹1,10,000 total; ₹70,000 broker',
    note: 'Remaining ₹40,000 is 50–50. Project started Sep, billing not started yet.',
    exampleBilling: {
      september2026: '110000.00',
    },
    externalObligations: {
      partyName: 'Broker',
      partyType: 'BROKER',
      amount: '70000.00',
    },
  },
];

export const REFERENCE_SEPTEMBER_PAYMENTS: ReferencePaymentData[] = [
  {
    id: 'p1',
    date: '2026-09-01',
    clientId: 'eshwar',
    amountReceived: '25000.00',
    externalPaid: '10000.00',
    collectedBy: 'ANURAG',
    disbursedBy: 'ANURAG',
    note: 'Last 15 days — ₹10,000 given to resource by Anurag; ₹15,000 remains with Anurag.',
  },
  {
    id: 'p2',
    date: '2026-09-01',
    clientId: 'sai',
    amountReceived: '20000.00',
    externalPaid: '0.00',
    collectedBy: 'VIVEK',
    note: 'Last 15 days — payment collected by Vivek.',
  },
];

export const REFERENCE_CARRY_FORWARD: ReferenceCarryForward = {
  fromPartner: 'ANURAG',
  toPartner: 'VIVEK',
  amount: '500.00',
  reason: 'Balance remaining from an older work payment transaction between partners.',
};
