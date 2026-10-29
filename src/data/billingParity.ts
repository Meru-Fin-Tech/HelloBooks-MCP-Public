/**
 * Which priced regions are charged in the currency the website advertises.
 *
 * Mirrored from Web-Fire-hellobooks.ai/src/lib/billingParity.ts. The billing
 * truth is HelloBooks-Backend-Auth-V3: only IN has a local-currency rail
 * (Razorpay). CA, GB, AU, AE, SG and NZ see a local-currency price on the site
 * but checkout charges the single USD Price — the US list price.
 *
 * This list must SHRINK, never grow: remove a country when Auth-V3 starts
 * charging its local price (Auth-V3 local-currency billing, still dark).
 * Anything that QUOTES a price to a customer — a voice agent above all — must
 * say what is actually charged.
 */

export const BILLED_IN_USD_DESPITE_LOCAL_PRICE = ['CA', 'GB', 'AU', 'AE', 'SG', 'NZ'] as const;

export function isBilledInUsd(country: string): boolean {
  return (BILLED_IN_USD_DESPITE_LOCAL_PRICE as readonly string[]).includes(country);
}
