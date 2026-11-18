// ── Billing types ────────────────────────────────────────────────────────────
//
// The saved payment method as GET /payment-method sends it (backend-2.0
// paymentMethod.model.js document, `isActive` / `isDeleted` rows filtered out).
// Pure API contract shapes only.

/** A saved payment method of the signed-in account holder. */
export interface SavedCard {
  _id: string;
  stripePaymentMethodId: string;
  type: "card" | "bank_account";
  isDefault: boolean;
  /** Present for `type: "card"`. */
  card?: { brand: string; last4: string; expMonth: number; expYear: number };
}
