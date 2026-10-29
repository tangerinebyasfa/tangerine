export function createWebsiteSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tangerine Fashion World",
    alternateName: "Tangerine",
    url: origin,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/products/all?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
