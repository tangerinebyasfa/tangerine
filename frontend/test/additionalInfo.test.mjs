import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  additionalInfoRows,
  formatAdditionalInfoText,
  normalizeAdditionalInfo,
  parseAdditionalInfoText,
} from '../lib/additionalInfo.mjs';

test('additional info rows keep their label and value pairs', () => {
  const rows = [{ label: 'Fabric', value: 'Cotton' }, { label: 'Fit', value: 'Relaxed' }];
  assert.deepEqual(normalizeAdditionalInfo(rows), rows);
});

test('additional info accepts legacy string rows and plain text', () => {
  assert.deepEqual(normalizeAdditionalInfo(['Fabric: Cotton', 'Fit: Relaxed']), [
    { label: 'Fabric', value: 'Cotton' },
    { label: 'Fit', value: 'Relaxed' },
  ]);
  assert.deepEqual(normalizeAdditionalInfo('Fabric: Cotton\nFit: Relaxed'), [
    { label: 'Fabric', value: 'Cotton' },
    { label: 'Fit', value: 'Relaxed' },
  ]);
});

test('stringified rows left by the old writer are dropped instead of rendered', () => {
  assert.deepEqual(normalizeAdditionalInfo(['[object Object]', '[object Object]']), []);
  assert.deepEqual(additionalInfoRows(['[object Object]', 'Fabric: Cotton']), [
    { label: 'Fabric', value: 'Cotton' },
  ]);
});

test('missing or blank additional info yields no rows', () => {
  for (const value of [null, undefined, [], '', '   ', {}]) assert.deepEqual(normalizeAdditionalInfo(value), []);
});

test('a row keeps a label even when the value is missing', () => {
  assert.deepEqual(normalizeAdditionalInfo([{ label: 'Care' }]), [{ label: 'Care', value: '' }]);
  assert.deepEqual(parseAdditionalInfoText('Care'), [{ label: 'Care', value: '' }]);
});

test('the admin form text round trips without losing labels', () => {
  const rows = [{ label: 'Fabric', value: 'Cotton' }, { label: 'Fit', value: 'Relaxed' }];
  const text = formatAdditionalInfoText(rows);
  assert.equal(text, 'Fabric: Cotton\nFit: Relaxed');
  assert.deepEqual(parseAdditionalInfoText(text), rows);
});
