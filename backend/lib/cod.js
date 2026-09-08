const { createHash } = require('node:crypto');

const SHIPPING = 8;
const transitions = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const text = (value) => typeof value === 'string' ? value.trim() : '';
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const money = (value) => Math.round(value * 100) / 100;

function normalizeItems(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 50) fail('Choose between 1 and 50 cart lines.');
  return raw.map(item => {
    const productId = text(item?.productId);
    if (!productId || productId.length > 150 || productId.includes('/')) fail('Invalid product.');
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) fail('Quantity must be a whole number between 1 and 99.');
    return { productId, quantity: item.quantity, size: text(item.size), color: text(item.color) };
  });
}

function price(product) {
  if (typeof product?.price !== 'number' || !Number.isFinite(product.price) || product.price < 0 || product.price > 10000000) fail('Product price is unavailable. Please contact the store.', 409);
  return money(product.price);
}

function address(raw) {
  const result = Object.fromEntries(['fullName', 'line1', 'line2', 'city', 'state', 'zip', 'country', 'phone'].map(key => [key, text(raw?.[key])]));
  if (['fullName', 'line1', 'city', 'state'].some(key => result[key].length < 2 || result[key].length > 200) || result.line2.length > 200) fail('Enter a complete delivery name and address.');
  if (!/^[1-9]\d{5}$/.test(result.zip)) fail('Enter a valid six-digit Indian PIN code.');
  if (!/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(result.phone)) fail('Enter a valid Indian mobile number.');
  if (result.country.toLowerCase() !== 'india') fail('Cash on delivery is currently available in India only.');
  result.country = 'India';
  return result;
}

function catalogItems(items, productMap) {
  const quantities = new Map();
  const lines = items.map(item => {
    const product = productMap.get(item.productId);
    if (!product) fail('A product is no longer available.', 404);
    if (product.active === false || !Number.isSafeInteger(product.stock) || product.stock < 0) fail('This product is unavailable for purchase.', 409);
    for (const [field, values] of [['size', product.sizes], ['color', product.colors]]) {
      const options = Array.isArray(values) ? values.map(String).map(s => s.trim()).filter(Boolean) : [];
      const structured = field === 'size' && Array.isArray(product.sizeOptions) ? product.sizeOptions : [];
      const available = structured.length ? structured.filter(s => s.available === true).map(s => s.label) : options;
      if ((available.length && !available.includes(item[field])) || (!available.length && item[field]) || (structured.length && !available.length)) fail(`Choose an available ${field} for ${product.name || 'this product'}.`, 409);
    }
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    const unitPrice = price(product);
    return { ...item, productName: text(product.name) || 'Product', productSlug: text(product.slug), productImage: text(product.image || product.images?.[0]), unitPrice, lineTotal: money(unitPrice * item.quantity) };
  });
  for (const [id, count] of quantities) {
    if (count > 99 || productMap.get(id).stock < count) fail(`Insufficient stock for ${productMap.get(id).name || 'product'}. Please update your bag.`, 409);
  }
  return { lines, quantities };
}

module.exports = { SHIPPING, transitions, fail, text, hash, money, normalizeItems, price, address, catalogItems };
