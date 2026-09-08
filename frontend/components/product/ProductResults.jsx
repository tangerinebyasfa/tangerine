"use client";

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import { catalogFacets, filterProducts } from '../../lib/catalogFilters.mjs';

const fields = ['size', 'color', 'categoryFilter', 'minPrice', 'maxPrice', 'stock', 'sale', 'sort'];
const inputStyle = 'mt-1 w-full border border-ink/20 bg-white px-3 py-2 text-sm';
export default function ProductResults({ products }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = Object.fromEntries(fields.map(field => [field, params.get(field) || '']));
  const facets = useMemo(() => catalogFacets(products), [products]);
  const visible = filterProducts(products, filters);
  const invalidRange = filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice);
  const active = fields.filter(field => filters[field]);
  function change(field, value) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(field, value); else next.delete(field);
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }
  function clear() {
    const next = new URLSearchParams(params.toString());
    fields.forEach(field => next.delete(field));
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }
  return <section className="space-y-6" aria-label="Product results">
    <div className="space-y-4 border border-ink/10 bg-[#fffaf6] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl">Find your fit</h2>{active.length > 0 && <button type="button" onClick={clear} className="text-sm underline">Clear filters</button>}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[['size', 'Size', facets.sizes], ['color', 'Colour', facets.colors], ['categoryFilter', 'Category', facets.categories]].map(([field, label, values]) => <label key={field} className="text-sm">{label}<select className={inputStyle} value={filters[field]} onChange={e => change(field, e.target.value)}><option value="">All</option>{filters[field] && !values.includes(filters[field]) && <option value={filters[field]}>{filters[field]}</option>}{values.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')}</option>)}</select></label>)}
        <label className="text-sm">Min price (₹)<input type="number" min="0" step="0.01" value={filters.minPrice} onChange={e => change('minPrice', e.target.value)} className={inputStyle} /></label>
        <label className="text-sm">Max price (₹)<input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={e => change('maxPrice', e.target.value)} className={inputStyle} /></label>
        <label className="text-sm">Sort by<select value={filters.sort} onChange={e => change('sort', e.target.value)} className={inputStyle}><option value="">Recommended</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
      </div>
      <div className="flex flex-wrap gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={filters.stock === '1'} onChange={e => change('stock', e.target.checked ? '1' : '')} /> In stock only</label><label className="flex items-center gap-2"><input type="checkbox" checked={filters.sale === '1'} onChange={e => change('sale', e.target.checked ? '1' : '')} /> On sale</label></div>
      {invalidRange && <p role="alert" className="text-sm text-rose-700">Minimum price must not exceed maximum price.</p>}
    </div>
    <p aria-live="polite" className="text-sm text-ink/65">{visible.length} of {products.length} products</p>
    {visible.length ? <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">{visible.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="border border-dashed p-8 text-center"><p>No products match these filters.</p><button type="button" onClick={clear} className="mt-3 text-tangerine underline">Clear filters and try again</button></div>}
  </section>;
}
