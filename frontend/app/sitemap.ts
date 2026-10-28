import { MetadataRoute } from 'next'

const BASE_URL = 'https://tangerinefashionworld.in'

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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.tangerinefashionworld.in'
    const [productsRes, subsRes] = await Promise.all([
      fetch(`${apiBase}/products`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${apiBase}/subcategories`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])

    const products = Array.isArray(productsRes) ? productsRes : []
    const productRoutes = products.map((p: any) => ({
      url: `${BASE_URL}/product/${p.slug || p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    const subs = Array.isArray(subsRes) ? subsRes : []
    const subRoutes = subs.map((s: any) => ({
      url: `${BASE_URL}/products/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticRoutes, ...subRoutes, ...productRoutes]
  } catch (e) {
    return staticRoutes
  }
}
