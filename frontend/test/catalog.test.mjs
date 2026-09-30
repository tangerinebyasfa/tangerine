import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, catalogFacets } from '../lib/catalogFilters.mjs';
import { parseSizeGuide, displayMeasurement, resolveSizeGuide } from '../lib/sizeGuide.mjs';
const products = [
  { id: 'a', name: 'Dress', price: 200, compareAtPrice: 300, stock: 2, sizes: ['S', 'M'], colors: ['Blue'], categorySlug: 'dresses', createdAt: '2026-01-01' },
  { id: 'b', name: 'Top', price: 100, stock: 0, sizes: ['M'], colors: ['Red'], categorySlug: 'tops', createdAt: '2026-02-01' },
  { id: 'c', name: 'Shirt', price: 150, stock: 3, sizeOptions: [{ label: 'M', available: false }, { label: 'L', available: true }], colors: ['blue'], categorySlug: 'tops', createdAt: { seconds: 1800000000 } },
];
test('combined size, colour, price, availability and sale filters use catalog data', () => {
  assert.deepEqual(filterProducts(products, { size: 'm', color: 'BLUE', minPrice: '150', maxPrice: '250', stock: '1', sale: '1' }).map(p => p.id), ['a']);
  assert.deepEqual(filterProducts(products, { size: 'M' }).map(p => p.id), ['a', 'b']);
  assert.deepEqual(filterProducts(products, { categoryFilter: 'tops', stock: '1' }).map(p => p.id), ['c']);
});
test('sorting does not mutate input and invalid ranges show no misleading results', () => {
  assert.deepEqual(filterProducts(products, { sort: 'price-asc' }).map(p => p.id), ['b', 'c', 'a']);
  assert.deepEqual(filterProducts(products, { sort: 'newest' }).map(p => p.id), ['c', 'b', 'a']);
  assert.equal(products[0].id, 'a');
  assert.equal(filterProducts(products, { minPrice: '500', maxPrice: '100' }).length, 0);
  assert.equal(filterProducts(products, { minPrice: '-1' }).length, 0);
});
test('facet values deduplicate colours and omit unavailable sizes', () => {
  const facets = catalogFacets(products);
  assert.deepEqual(facets.colors, ['Blue', 'Red']);
  assert.deepEqual(facets.sizes, ['L', 'M', 'S']);
});
test('size charts preserve notes, allow Markdown pipes, and flag malformed rows', () => {
  const guide = parseSizeGuide('Body measurements\n| Size | Chest (cm) |\n| --- | --- |\n| S | 86 |\n| M | 90-94 |');
  assert.equal(guide.notes, 'Body measurements'); assert.equal(guide.rows.length, 2);
  assert.equal(guide.headers[1], 'Chest (cm)');
  assert(parseSizeGuide('Size | Chest\nM | 90 | 80').error);
  assert.equal(parseSizeGuide('Ask for fit advice.').notes, 'Ask for fit advice.');
});
test('unit conversion only changes explicitly labelled numeric cm measurements', () => {
  assert.equal(displayMeasurement('25.4', 'Length (cm)', true), '10.0');
  assert.equal(displayMeasurement('25.4-50.8', 'Length (cm)', true), '10.0-20.0');
  assert.equal(displayMeasurement('42', 'EU size', true), '42');
  assert.equal(displayMeasurement('N/A', 'Waist (cm)', true), 'N/A');
  assert.equal(displayMeasurement('25.4', 'Length (cm)', false), '25.4');
});
test('clothes without a chart fall back to the standard womens chart, footwear does not', () => {
  const fallback = resolveSizeGuide('', 'clothes');
  assert.deepEqual(fallback.headers, ['Size', 'Bust (in)', 'Waist (in)', 'Hips (in)']);
  assert.deepEqual(fallback.rows.map(row => row[0]), ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  assert.deepEqual(fallback.rows.find(row => row[0] === 'M').slice(1), ['36"', '30"', '39"']);
  assert.equal(resolveSizeGuide('', 'footwear').headers.length, 0);
  assert.equal(resolveSizeGuide(undefined, undefined).rows.length, 6);
});
test('a product specific chart always wins over the fallback chart', () => {
  const guide = resolveSizeGuide('| Size | Chest (cm) |\n| --- | --- |\n| S | 86 |', 'clothes');
  assert.deepEqual(guide.headers, ['Size', 'Chest (cm)']);
  assert.deepEqual(guide.rows, [['S', '86']]);
});
test('notes-only guides are replaced by the fallback chart for clothes', () => {
  assert.equal(resolveSizeGuide('Ask for fit advice.', 'clothes').rows.length, 6);
  assert.equal(resolveSizeGuide('Ask for fit advice.', 'footwear').notes, 'Ask for fit advice.');
});
