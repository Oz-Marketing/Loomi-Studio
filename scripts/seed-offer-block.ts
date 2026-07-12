/**
 * Seed the global "Vehicle offer block" — the switchable offer amount block
 * (label + $ + number + % + terms) as a NORMAL saved AdBlock, so it's listed and
 * managed (rename / delete) exactly like any user-saved block. There is no
 * code-provided built-in; the block is data, seeded once per environment.
 *
 * Lifts the 5 offer elements + their square boxes from the Vehicle Offer starter
 * and packages them as a block payload with `offerKit: 'single'`, so inserting it
 * also re-seeds the offer field kit (offerType + per-type fields). Idempotent
 * upsert (keyed on the global block's name). Run:
 *
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-offer-block.ts
 */
import { prisma } from '../src/lib/prisma';
import { singleOfferDoc } from '../src/lib/ad-generator/templates/offer-docs';
import { BLOCK_PAYLOAD_VERSION, type BlockPayload } from '../src/lib/ad-generator/blocks';
import type { DocElement, DocLayoutBox } from '../src/lib/ad-generator/doc-types';

const NAME = 'Vehicle offer block';
const DESCRIPTION =
  'Switchable offer amount block — label + $ + number + % + terms. Reformats for lease / APR / cash / discount and adds the offer fields on insert.';
const ELEMENT_IDS = ['offerLabel', 'offerCurrency', 'offerValue', 'offerPercent', 'offerTerms'];

const payload: BlockPayload = {
  version: BLOCK_PAYLOAD_VERSION,
  sourceSize: { w: 1080, h: 1080 },
  elements: ELEMENT_IDS.map((id) => singleOfferDoc.elements.find((e) => e.id === id)).filter(
    (e): e is DocElement => !!e,
  ),
  boxes: Object.fromEntries(
    ELEMENT_IDS.map((id) => [id, singleOfferDoc.layouts.square?.[id]]).filter(([, b]) => b),
  ) as Record<string, DocLayoutBox>,
  offerKit: 'single',
  requiredFields: [],
  requiredDefaults: {},
};

async function main() {
  if (payload.elements.length !== ELEMENT_IDS.length) {
    throw new Error(`Expected ${ELEMENT_IDS.length} offer elements, found ${payload.elements.length}`);
  }
  const doc = JSON.stringify(payload);
  // Global block = both scope columns null. Idempotent on the name.
  const existing = await prisma.adBlock.findFirst({
    where: { name: NAME, accountKey: null, accountKeys: null },
  });
  if (existing) {
    await prisma.adBlock.update({
      where: { id: existing.id },
      data: { doc, description: DESCRIPTION, isActive: true },
    });
    console.log(`Updated global block "${NAME}" (${existing.id})`);
  } else {
    const row = await prisma.adBlock.create({
      data: { name: NAME, description: DESCRIPTION, doc, isActive: true },
    });
    console.log(`Created global block "${NAME}" (${row.id})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    void prisma.$disconnect();
    process.exit(1);
  });
