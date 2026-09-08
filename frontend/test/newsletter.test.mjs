import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNewsletterEmail, newsletterSuitable } from '../lib/newsletter.mjs';

test('newsletter appears on storefront pages and stays off purchase/account/admin flows', () => {
  for (const path of ['/', '/products/all', '/product/dress', '/blog/story', '/about/story', '/gallery', '/contact', '/return']) assert.equal(newsletterSuitable(path), true, path);
  for (const path of ['/checkout', '/checkout/success/123', '/cart', '/orders/123', '/profile', '/signin', '/signup', '/admin', '/admin/products', '/missing-page']) assert.equal(newsletterSuitable(path), false, path);
});
test('newsletter email normalization rejects malformed values', () => {
  assert.equal(normalizeNewsletterEmail(' Reader+style@Example.com '), 'reader+style@example.com');
  for (const value of [null, {}, '', 'missing-at.example', 'name@', 'name@site', 'two names@site.com', 'a@@site.com', 'x'.repeat(255) + '@site.com']) assert.equal(normalizeNewsletterEmail(value), null);
});
