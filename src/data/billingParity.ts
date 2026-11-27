/**
 * Which priced regions are charged in the currency the website advertises.
 *
 * Mirrored from Web-Fire-hellobooks.ai/src/lib/billingParity.ts. The billing
 * truth is HelloBooks-Backend-Auth-V3: only IN has a local-currency rail
 * (Razorpay). CA, GB, AU, AE, SG and NZ used to show a local-currency price on the site
 * while checkout charged the single USD Price; since 2026-11-23 the site shows USD.
 *
 * This list must SHRINK, never grow: remove a country when Auth-V3 starts
 * charging its local price (Auth-V3 local-currency billing, still dark).
 * Anything that QUOTES a price to a customer — a voice agent above all — must
 * say what is actually charged.
 */

// Emptied 2026-11-27 (Web-Fire v12, 2026-11-23): CA, GB, AU, AE, SG and NZ are now
// PRICED in USD on the US five-tier list, so the price shown is the price charged.
// Parity by identity — the same as US and KE. Only add a country back here if a
// local-currency price is ever advertised before Auth-V3 charges it.
export const BILLED_IN_USD_DESPITE_LOCAL_PRICE = [] as const;

export function isBilledInUsd(country: string): boolean {
  return (BILLED_IN_USD_DESPITE_LOCAL_PRICE as readonly string[]).includes(country);
}
