// Repairs products whose `additionalInfo` was saved in a broken shape.
//
// Older writes ran the field through a list normalizer that stringifies every
// entry, so `{ label, value }` rows were stored as "[object Object]" and the
// product page's "Additional Information" table rendered empty.
//
// Rows that were already stringified are unrecoverable - this script drops them
// and rewrites every remaining row into the canonical { label, value } shape.
//
// Usage: node scripts/repair-additional-info.js [--dry-run]

const { db } = require('../config/firebaseAdmin');
const { normalizeAdditionalInfo } = require('../lib/additionalInfo');

const dryRun = process.argv.includes('--dry-run');

const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const snapshot = await db.collection('products').get();

  let changed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (!('additionalInfo' in data)) continue;

    const current = Array.isArray(data.additionalInfo) ? data.additionalInfo : [];
    const repaired = normalizeAdditionalInfo(data.additionalInfo);

    if (isSame(current, repaired)) continue;

    changed += 1;
    console.log(`[repair] ${doc.id} (${data.name || 'unnamed'})`);
    console.log(`         before: ${JSON.stringify(current)}`);
    console.log(`         after:  ${JSON.stringify(repaired)}`);

    if (!dryRun) {
      await doc.ref.update({ additionalInfo: repaired, updatedAt: new Date().toISOString() });
    }
  }

  console.log(`[repair] ${changed} product(s) ${dryRun ? 'would be' : 'were'} updated.`);
  process.exit(0);
})().catch((error) => {
  console.error('[repair] failed:', error);
  process.exit(1);
});
