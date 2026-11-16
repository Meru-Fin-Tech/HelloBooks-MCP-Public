/**
 * Paid 1:1 onboarding support and the included support program.
 *
 * Set by the founder on 2026-10-05 for the post-onboarding voice call:
 *   India — ₹5,000 for 10 hours of 1:1 onboarding support
 *   US    — $300 for 10 hours of 1:1 onboarding support
 * delivered on Google Meet or Zoom, whichever the customer prefers.
 *
 * This is NOT the done-for-you migration service (India Onboarding plan from
 * ₹9,000 / Essentials from $199, Web-Fire src/lib/qboMigrationOffer.ts). That
 * one moves a customer's books from other software for them; this one is
 * hours of hands-on help while they set HelloBooks up themselves. Keep the two
 * apart in anything an agent says.
 *
 * Countries without an entry have no published hourly offer — an agent must
 * not invent or convert one.
 */

export const ONBOARDING_SUPPORT_REVIEWED = '2026-10-05';

export interface OnboardingSupportOffer {
  country: 'IN' | 'US';
  currency: 'INR' | 'USD';
  symbol: string;
  price: number;
  hours: number;
  /** Customer chooses; the team sends the meeting link. */
  meetingTools: readonly string[];
  covers: readonly string[];
}

const COVERS = [
  'company and entity setup, chart of accounts and opening balances',
  'importing customers, suppliers, items and bank statements',
  'accounting questions that come up while getting set up',
  'training the people who will use HelloBooks day to day',
] as const;

export const ONBOARDING_SUPPORT_OFFERS: Readonly<Record<'IN' | 'US', OnboardingSupportOffer>> = {
  IN: {
    country: 'IN', currency: 'INR', symbol: '₹', price: 5000, hours: 10,
    meetingTools: ['Google Meet', 'Zoom'],
    covers: [...COVERS, 'GST setup and a walk-through of the first GSTR-1 and GSTR-3B filing'],
  },
  US: {
    country: 'US', currency: 'USD', symbol: '$', price: 300, hours: 10,
    meetingTools: ['Google Meet', 'Zoom'],
    covers: COVERS,
  },
};

export function onboardingSupportFor(country: string): OnboardingSupportOffer | null {
  return country === 'IN' || country === 'US' ? ONBOARDING_SUPPORT_OFFERS[country] : null;
}

/** Included on every plan — the "ongoing support program". */
export const INCLUDED_SUPPORT =
  'Basic technical support is included on every plan at no extra cost.';

/** Done-for-you migration, per country. Mention only when they ask about moving data. */
export const MIGRATION_SERVICE: Readonly<Record<string, string>> = {
  IN: 'If they want us to move their books from other software for them, that is a separate done-for-you service starting at ₹9,000.',
  US: 'If they want us to move their books from QuickBooks for them, that is a separate done-for-you service starting at $199.',
  CA: 'If they want us to move their books from QuickBooks for them, that is a separate done-for-you service starting at US$199.',
  GB: 'If they want us to move their books from QuickBooks for them, that is a separate done-for-you service starting at US$199.',
  AU: 'If they want us to move their books from QuickBooks for them, that is a separate done-for-you service starting at US$199.',
};
