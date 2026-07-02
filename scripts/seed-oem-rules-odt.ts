/**
 * Seed OEM offer-compliance rules ported from Oz Dealer Tools' Monthly Offers
 * system (`oem_offer_rules` cPanel export, 2026-07-01) — the REAL rules the
 * builder enforced (the earlier `ad_oem_required_fields` export was the
 * separate AI Studio's table).
 *
 * Key translation (ODT snake_case → Loomi FieldSpec keys):
 *   offer_end_date → expiration      lease_due     → dueAtSigning
 *   stock_number   → stockNumber     security_deposit → securityDeposit
 *   apr_term/lease_term → aprTerm/leaseTerm         cost_per_thousand → costPerThousand
 *   financial_institution → financialInstitution    discount_source → discountSource
 *   trim → vehicleName (Loomi's combined Vehicle field carries the trim)
 *
 * Sanitization: ODT's data required lease-only fields (lease_due,
 * security_deposit) and APR-only fields (cost_per_thousand,
 * financial_institution) on offer types where Loomi's form doesn't show them —
 * that would block export with no way to fill the field, and it reads as
 * builder misconfiguration rather than OEM policy. Those keys are kept only on
 * the offer types whose form exposes them.
 *
 * Idempotent upsert. Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-oem-rules-odt.ts
 */
import { prisma } from '../src/lib/prisma';

const RULES: { make: string; requiredFields: Record<string, string[]>; notes: string }[] = [
  {
    make: 'Subaru',
    requiredFields: {
      lease: ['vin', 'msrp', 'disclaimer', 'expiration', 'leaseTerm', 'dueAtSigning', 'securityDeposit'],
      apr: ['vin', 'msrp', 'disclaimer', 'expiration', 'aprTerm'],
      discount: ['vin', 'msrp', 'disclaimer', 'expiration', 'discountSource'],
      sales_price: ['vin', 'msrp', 'disclaimer', 'expiration'],
      custom: ['vin', 'expiration'],
    },
    notes: 'Ported from ODT Monthly Offers oem_offer_rules. Lease-only keys kept on lease only (see seed script).',
  },
  {
    make: 'Kia',
    requiredFields: {
      lease: ['msrp', 'disclaimer', 'expiration', 'leaseTerm', 'dueAtSigning'],
      apr: ['disclaimer', 'expiration', 'aprTerm', 'financialInstitution', 'costPerThousand'],
      discount: ['msrp', 'disclaimer', 'expiration', 'discountSource'],
      sales_price: ['vin', 'msrp', 'disclaimer', 'expiration'],
      custom: ['disclaimer', 'expiration'],
    },
    notes: 'Ported from ODT Monthly Offers oem_offer_rules.',
  },
  {
    make: 'Mazda',
    requiredFields: {
      lease: ['msrp', 'disclaimer', 'expiration', 'leaseTerm', 'dueAtSigning'],
      apr: ['disclaimer', 'expiration', 'aprTerm', 'financialInstitution', 'costPerThousand'],
      discount: ['vehicleName', 'disclaimer', 'expiration', 'discountSource'],
      sales_price: ['vehicleName', 'msrp', 'disclaimer', 'expiration', 'discountSource'],
      custom: ['msrp', 'disclaimer'],
    },
    notes: 'Ported from ODT Monthly Offers oem_offer_rules. trim → vehicleName; APR-only keys dropped from lease/custom (see seed script).',
  },
  {
    make: 'Volkswagen',
    requiredFields: {
      lease: ['vin', 'stockNumber', 'msrp', 'disclaimer', 'expiration', 'leaseTerm'],
      apr: ['vin', 'stockNumber', 'msrp', 'disclaimer', 'expiration', 'aprTerm', 'financialInstitution', 'costPerThousand'],
      discount: ['vin', 'stockNumber', 'msrp', 'disclaimer', 'expiration', 'discountSource'],
      sales_price: ['vehicleName', 'vin', 'stockNumber', 'msrp', 'disclaimer', 'expiration'],
      custom: [],
    },
    notes: 'Ported from ODT Monthly Offers oem_offer_rules. trim → vehicleName; lease_due dropped from apr/sales_price (see seed script).',
  },
];

async function main() {
  for (const r of RULES) {
    const row = await prisma.adOemOfferRule.upsert({
      where: { make: r.make },
      create: { make: r.make, requiredFields: JSON.stringify(r.requiredFields), notes: r.notes },
      update: { requiredFields: JSON.stringify(r.requiredFields), notes: r.notes, isActive: true },
    });
    console.log(`upserted OEM rule: ${row.make}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
