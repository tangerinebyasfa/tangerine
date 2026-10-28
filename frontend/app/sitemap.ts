import { MetadataRoute } from 'next'

const BASE_URL = 'https://tangerinefashionworld.in'

export const dynamic = 'force-dynamic'

function safeDate(value: any): Date {
  if (!value) return new Date()
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) return new Date()
    return date
  } catch {
    return new Date()
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/products/all',
    '/products/indian',
    '/products/western',
    '/products/casual',
    '/products/corporate',
    '/products/accessories',
    '/products/outlet',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tangerinefashionworld.in'
    const [productsRes, subsRes] = await Promise.allSettled([
      fetch(`${apiBase}/products`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${apiBase}/subcategories`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])

    const products = productsRes.status === 'fulfilled' && Array.isArray(productsRes.value) ? productsRes.value : []
    const productRoutes = products
      .map((p: any) => {
        const identifier = p?.slug || p?.id || p?._id
        if (!identifier) return null
        return {
          url: `${BASE_URL}/product/${encodeURIComponent(String(identifier))}`,
          lastModified: safeDate(p?.updatedAt || p?.updated_at || p?.createdAt || p?.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }
      })
      .filter(Boolean) as MetadataRoute.Sitemap

    const subs = subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) ? subsRes.value : []
    const subRoutes = subs
      .map((s: any) => {
        const slug = s?.slug || s?.name
        if (!slug) return null
        return {
          url: `${BASE_URL}/products/${encodeURIComponent(String(slug).toLowerCase())}`,
          lastModified: safeDate(s?.updatedAt || s?.updated_at),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }
      })
      .filter(Boolean) as MetadataRoute.Sitemap

    return [...staticRoutes, ...subRoutes, ...productRoutes]
  } catch (e) {
    return staticRoutes
  }
}
