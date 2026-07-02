/**
 * Seed disclaimer templates ported from Oz Dealer Tools' Monthly Offers system
 * (`disclaimer_templates` cPanel export, 2026-07-01).
 *
 * Body translation for Loomi's token engine:
 *  - `{year} {make} {model} {trim}` → `{vehicle}` (Loomi's combined Vehicle field)
 *  - literal `$` before `{msrp}` / `{due_at_signing}` / `{monthly_payment}`
 *    removed — Loomi's substitution formats those as "$45,000" already
 * Skipped: the "Oz Lease" row (make "Oz" — a test entry, not a real OEM).
 *
 * Idempotent by (make, offerType, name). Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-disclaimer-templates-odt.ts
 */
import { prisma } from '../src/lib/prisma';

const TEMPLATES: { make: string; offerType: string; name: string; body: string; isDefault: boolean }[] = [
  {
    make: 'Kia',
    offerType: 'apr',
    name: 'Kia APR Disclaimer',
    isDefault: false,
    body:
      '{apr_rate} APR for {apr_term} months. {cost_per_thousand} per month per $1,000 financed at {apr_term} months. ' +
      'APR financing subject to credit approval by {financial_institution} for well-qualified buyers. Not all customers ' +
      'will qualify for advertised APR. Subject to vehicle availability and dealer participation. New vehicles only. ' +
      'Must take from retail stock by {offer_end_date}. Finance contract must be signed and dated no later than ' +
      '{offer_end_date}. Limited inventory available.',
  },
  {
    make: 'Volkswagen',
    offerType: 'lease',
    name: 'Volkswagen Lease',
    isDefault: false,
    body:
      'Closed end lease financing available through {offer_end_date} for a new, unused {vehicle} on approved credit to ' +
      'well-qualified customers by Volkswagen Financial Services through participating dealers in ID, WA, UT, OR and CO. ' +
      'Monthly lease payment based on MSRP of {msrp} and destination charges, less a suggested dealer contribution and ' +
      'application of a $1,000 Customer Bonus resulting in a Selling Price of {msrp}. Excludes tax, title, license, ' +
      "options and dealer fees. Amount due at signing includes first month's payment, customer down payment of " +
      '{due_at_signing}, and acquisition fee of $699. Monthly payments total {monthly_payment}. Your payment will vary ' +
      'based on dealer contribution and the final negotiated price. At lease end, lessee responsible for disposition fee ' +
      'of $395, $0.20/mile over 30,000 miles and excessive wear and use. Customer Bonus applied toward lease contract ' +
      'when using discounted Volkswagen Financial Services Special Lease program only and is not redeemable for cash. ' +
      'A $395 fee applies if you purchase your lease vehicle. No security deposit required. Limited inventory available. ' +
      'Offer not valid in Puerto Rico. VIN: {vin}. Stock: {stock_number}. {vehicle} shown. See your participating ' +
      'Volkswagen dealer for details or call 1-800-Drive-VW. Young Volkswagen of Layton. Offer ends {offer_end_date}. ' +
      '©2026 Volkswagen of America, Inc.',
  },
];

async function main() {
  for (const t of TEMPLATES) {
    const existing = await prisma.adDisclaimerTemplate.findFirst({
      where: { make: t.make, offerType: t.offerType, name: t.name },
    });
    if (existing) {
      await prisma.adDisclaimerTemplate.update({
        where: { id: existing.id },
        data: { body: t.body, isDefault: t.isDefault, isActive: true },
      });
      console.log(`updated disclaimer template: ${t.make} / ${t.offerType} / ${t.name}`);
    } else {
      await prisma.adDisclaimerTemplate.create({
        data: { make: t.make, offerType: t.offerType, name: t.name, body: t.body, isDefault: t.isDefault },
      });
      console.log(`created disclaimer template: ${t.make} / ${t.offerType} / ${t.name}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
