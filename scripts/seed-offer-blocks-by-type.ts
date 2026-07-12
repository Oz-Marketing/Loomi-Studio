/**
 * Seed FOUR per-offer-type offer blocks — Sale Price / APR / Discount / Lease —
 * as normal global AdBlocks. Each block's elements are gated to its offer type
 * (`visibleWhen`), so all four can live on ONE template overlapping in the offer
 * area: whichever offer type the client picks, only that block renders. Each is
 * grouped (inserts as one movable unit) and carries `offerKit: 'single'` so the
 * offerType question + per-type fields seed on insert and the `_offer*` tokens
 * resolve.
 *
 * Layouts approximate the reference mockup (big number left, symbol beside it,
 * label box right, terms banner bottom) — a starting point to refine in-editor.
 * Idempotent upsert per block name. Run:
 *
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-offer-blocks-by-type.ts
 */
import { prisma } from '../src/lib/prisma';
import { BLOCK_PAYLOAD_VERSION, type BlockPayload } from '../src/lib/ad-generator/blocks';
import type { DocElement, DocLayoutBox } from '../src/lib/ad-generator/doc-types';
import type { OfferType } from '../src/lib/ad-generator/offer-text';

interface BlockSpec {
  type: OfferType;
  name: string;
  label: string; // static label copy (matches the mockup)
  symbol: '$' | '%' | null;
  symbolBox?: DocLayoutBox;
  numberBox: DocLayoutBox;
  labelBox: DocLayoutBox;
  termsBox: DocLayoutBox;
}

function buildBlock(spec: BlockSpec): { name: string; description: string; payload: BlockPayload } {
  const gid = `grp-offer-${spec.type}`;
  const visibleWhen = { field: 'offerType', in: [spec.type] };
  const idp = `offer-${spec.type}`;
  const elements: DocElement[] = [];
  const boxes: Record<string, DocLayoutBox> = {};

  const add = (id: string, el: Omit<DocElement, 'id' | 'type' | 'groupId' | 'visibleWhen'>, box: DocLayoutBox) => {
    elements.push({ id, type: 'text', groupId: gid, visibleWhen, ...el });
    boxes[id] = box;
  };

  if (spec.symbol && spec.symbolBox) {
    add(
      `${idp}-symbol`,
      { name: `${spec.symbol} symbol`, binding: { kind: 'static', value: spec.symbol }, fontWeight: 800, color: '#0f172a', letterSpacing: -1, align: 'left', vAlign: 'top' },
      spec.symbolBox,
    );
  }
  add(
    `${idp}-number`,
    { name: 'Offer number', binding: { kind: 'field', key: '_offerValue' }, fontWeight: 800, color: '#0f172a', lineHeight: 0.95, letterSpacing: -1, align: 'left' },
    spec.numberBox,
  );
  add(
    `${idp}-label`,
    { name: 'Offer label', binding: { kind: 'static', value: spec.label }, fontWeight: 700, color: 'brand', uppercase: true, letterSpacing: 1, align: 'left' },
    spec.labelBox,
  );
  add(
    `${idp}-terms`,
    { name: 'Terms', binding: { kind: 'field', key: '_offerTerms' }, fontWeight: 500, color: '#475569', align: 'left' },
    spec.termsBox,
  );

  return {
    name: spec.name,
    description: `Offer block for ${spec.label} — shows only when the offer type is ${spec.type}. Grouped; adds the offer fields on insert.`,
    payload: {
      version: BLOCK_PAYLOAD_VERSION,
      sourceSize: { w: 1080, h: 1080 },
      elements,
      boxes,
      offerKit: 'single',
      requiredFields: [],
      requiredDefaults: {},
      groups: [{ id: gid, name: spec.name }],
    },
  };
}

const SPECS: BlockSpec[] = [
  {
    type: 'sales_price',
    name: 'Sale Price offer',
    label: 'SALE PRICE',
    symbol: '$',
    symbolBox: { x: 0.06, y: 0.4, w: 0.06, h: 0.1, z: 5, fontSize: 64 },
    numberBox: { x: 0.13, y: 0.36, w: 0.55, h: 0.22, z: 5, fontSize: 150 },
    labelBox: { x: 0.72, y: 0.4, w: 0.2, h: 0.14, z: 5, fontSize: 40 },
    termsBox: { x: 0.06, y: 0.62, w: 0.86, h: 0.06, z: 5, fontSize: 30 },
  },
  {
    type: 'apr',
    name: 'APR offer',
    label: 'APR',
    symbol: '%',
    symbolBox: { x: 0.66, y: 0.36, w: 0.1, h: 0.09, z: 5, fontSize: 64 },
    numberBox: { x: 0.06, y: 0.36, w: 0.58, h: 0.22, z: 5, fontSize: 150 },
    labelBox: { x: 0.78, y: 0.47, w: 0.14, h: 0.08, z: 5, fontSize: 40 },
    termsBox: { x: 0.06, y: 0.62, w: 0.86, h: 0.06, z: 5, fontSize: 30 },
  },
  {
    type: 'discount',
    name: 'Discount offer',
    label: 'OFF MSRP',
    symbol: '$',
    symbolBox: { x: 0.06, y: 0.4, w: 0.06, h: 0.1, z: 5, fontSize: 64 },
    numberBox: { x: 0.13, y: 0.36, w: 0.52, h: 0.22, z: 5, fontSize: 150 },
    labelBox: { x: 0.7, y: 0.4, w: 0.2, h: 0.14, z: 5, fontSize: 40 },
    termsBox: { x: 0.06, y: 0.62, w: 0.86, h: 0.06, z: 5, fontSize: 30 },
  },
  {
    type: 'lease',
    name: 'Lease offer',
    label: 'PER MONTH LEASE',
    symbol: '$',
    symbolBox: { x: 0.06, y: 0.4, w: 0.06, h: 0.1, z: 5, fontSize: 64 },
    numberBox: { x: 0.13, y: 0.36, w: 0.42, h: 0.22, z: 5, fontSize: 150 },
    labelBox: { x: 0.6, y: 0.38, w: 0.2, h: 0.18, z: 5, fontSize: 40 },
    termsBox: { x: 0.06, y: 0.62, w: 0.86, h: 0.08, z: 5, fontSize: 28 },
  },
];

async function main() {
  for (const spec of SPECS) {
    const { name, description, payload } = buildBlock(spec);
    const doc = JSON.stringify(payload);
    const existing = await prisma.adBlock.findFirst({ where: { name, accountKey: null, accountKeys: null } });
    if (existing) {
      await prisma.adBlock.update({ where: { id: existing.id }, data: { doc, description, isActive: true } });
      console.log(`Updated global block "${name}" (${existing.id})`);
    } else {
      const row = await prisma.adBlock.create({ data: { name, description, doc, isActive: true } });
      console.log(`Created global block "${name}" (${row.id})`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    void prisma.$disconnect();
    process.exit(1);
  });
