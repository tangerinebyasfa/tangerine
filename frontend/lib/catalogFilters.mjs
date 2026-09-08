export function availableSizes(product) {
  return product.sizeOptions?.length
    ? product.sizeOptions.filter(option => option.available === true).map(option => String(option.label))
    : (product.sizes || []).map(String);
}
const key = value => String(value || '').trim().toLowerCase();
export function filterProducts(products, filters = {}) {
  const min = filters.minPrice === '' || filters.minPrice == null ? 0 : Number(filters.minPrice);
  const max = filters.maxPrice === '' || filters.maxPrice == null ? Infinity : Number(filters.maxPrice);
  if (!Number.isFinite(min) || min < 0 || Number.isNaN(max) || max < min) return [];
  const filtered = products.filter(product => {
    const price = Number(product.price);
    return Number.isFinite(price) && price >= min && price <= max
      && (!filters.size || availableSizes(product).some(size => key(size) === key(filters.size)))
      && (!filters.color || (product.colors || []).some(color => key(color) === key(filters.color)))
      && (!filters.categoryFilter || key(product.categorySlug || product.productType) === key(filters.categoryFilter))
      && (filters.stock !== '1' || Number(product.stock) > 0)
      && (filters.sale !== '1' || Number(product.compareAtPrice) > price);
  });
  const stamp = value => value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : Date.parse(value) || 0);
  const compare = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
    newest: (a, b) => stamp(b.createdAt) - stamp(a.createdAt),
  }[filters.sort];
  return compare ? filtered.sort(compare) : filtered;
}

export function catalogFacets(products) {
  const unique = values => {
    const choices = new Map();
    values.filter(Boolean).forEach(value => { if (!choices.has(key(value))) choices.set(key(value), String(value)); });
    return [...choices.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };
  return {
    sizes: unique(products.flatMap(availableSizes)),
    colors: unique(products.flatMap(product => product.colors || [])),
    categories: unique(products.map(product => product.categorySlug || product.productType)),
  };
}
