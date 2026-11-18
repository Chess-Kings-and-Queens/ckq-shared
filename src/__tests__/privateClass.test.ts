import * as shared from '../index';
import {
  PRIVATE_CLASS_CONTRACT_TYPE_LABELS,
  type AccountType,
  type CancellationReasonsResponse,
  type CancellationRequest,
  type ContractType,
  type PrivateClassOffer,
  type PrivateClassSlot,
} from '../types/privateClass';
import type { SavedCard } from '../types/billing';

/** Every member of the `ContractType` union; the `satisfies` makes a new member fail to compile here. */
const CONTRACT_TYPES = ['coach-teaching', 'coach-playing'] as const satisfies readonly ContractType[];
type MissingContractType = Exclude<ContractType, (typeof CONTRACT_TYPES)[number]>;
const noMissingContractType: MissingContractType[] = [];

describe('PRIVATE_CLASS_CONTRACT_TYPE_LABELS', () => {
  it('has exactly one label per ContractType member', () => {
    expect(Object.keys(PRIVATE_CLASS_CONTRACT_TYPE_LABELS).sort()).toEqual([...CONTRACT_TYPES].sort());
    expect(noMissingContractType).toHaveLength(0);
  });

  it('maps the backend enum to its display label', () => {
    expect(PRIVATE_CLASS_CONTRACT_TYPE_LABELS['coach-teaching']).toBe('Lesson');
    expect(PRIVATE_CLASS_CONTRACT_TYPE_LABELS['coach-playing']).toBe('Playing Coach');
  });

  it('is exported from the package index', () => {
    expect(shared.PRIVATE_CLASS_CONTRACT_TYPE_LABELS).toBe(PRIVATE_CLASS_CONTRACT_TYPE_LABELS);
  });

  it('adds no cancellation reason list or label map to the package (ADR frontend-010)', () => {
    const names = Object.keys(shared).filter((n) => /cancel/i.test(n));
    expect(names).toEqual([]);
  });
});

describe('private-class types', () => {
  it('PrivateClassOffer accepts a pending offer and a fully-priced accepted one', () => {
    const pending: PrivateClassOffer = { _id: 'e1', status: 'pending' };
    const accepted: PrivateClassOffer = {
      _id: 'e2',
      status: 'accepted',
      coach: { _id: 'c1', firstName: 'Ada', lastName: 'Lovelace' },
      student: { _id: 's1', firstName: 'Sam', lastName: 'Lee' },
      hourlyRate: null,
      sessionPrices: [{ scheduleId: 'sl1', dayOfWeek: 'Friday', startTime: '18:30', durationMinutes: 30, price: 35 }],
      contractType: 'coach-playing',
      recordingConsentAt: null,
      termsVersion: '3.0',
    };
    expect(pending.status).toBe('pending');
    expect(accepted.sessionPrices?.[0].price).toBe(35);
  });

  it('rejects an unknown status and contract type at compile time', () => {
    // @ts-expect-error status is a four-member union
    const badStatus: PrivateClassOffer = { _id: 'e3', status: 'paused' };
    // @ts-expect-error contractType is "coach-teaching" | "coach-playing"
    const badType: PrivateClassOffer = { _id: 'e4', status: 'pending', contractType: 'group' };
    expect([badStatus, badType]).toHaveLength(2);
  });

  it('PrivateClassSlot carries the backend-computed date and price as optional', () => {
    const bare: PrivateClassSlot = { _id: 'sl1', dayOfWeek: 'Monday', startTime: '16:00', durationMinutes: 60 };
    const priced: PrivateClassSlot = { ...bare, firstSessionDate: '2026-11-23', sessionPrice: 60 };
    expect(priced.sessionPrice).toBe(60);
    expect(bare.firstSessionDate).toBeUndefined();
  });

  it('AccountType is child or adult', () => {
    const types: AccountType[] = ['child', 'adult'];
    // @ts-expect-error only child and adult exist
    const bad: AccountType = 'teen';
    expect([...types, bad]).toHaveLength(3);
  });

  it('cancellation types are response and request shapes only', () => {
    const response: CancellationReasonsResponse = {
      reasons: [{ code: 'other', label: 'Other', requiresText: true }],
      textMin: 5,
      textMax: 500,
    };
    const request: CancellationRequest = { reasonCode: response.reasons[0].code, reason: 'moving' };
    expect(request.reasonCode).toBe('other');
  });
});

describe('billing types', () => {
  it('SavedCard fixture compiles with and without card details', () => {
    const card: SavedCard = {
      _id: 'pm1',
      stripePaymentMethodId: 'pm_123',
      type: 'card',
      isDefault: true,
      card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
    };
    const bank: SavedCard = { _id: 'pm2', stripePaymentMethodId: 'pm_456', type: 'bank_account', isDefault: false };
    // @ts-expect-error isDefault is required
    const missingDefault: SavedCard = { _id: 'pm3', stripePaymentMethodId: 'pm_789', type: 'card' };
    expect([card, bank, missingDefault]).toHaveLength(3);
    expect(card.card?.last4).toBe('4242');
  });
});
