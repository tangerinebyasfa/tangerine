import { toAbsoluteUrl } from "./schemaUtils";

export function createBreadcrumbSchema(items = [], origin) {
  const itemListElement = items
    .filter((item) => item && item.name && item.url)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.url, origin),
    }))
    .filter((item) => item.item);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}
