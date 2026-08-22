import { normalizeImageUrl } from "../lib/image";
import { toAbsoluteUrl } from "./schemaUtils";

function getNumericField(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined || value === "") continue;

    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return null;
}

export function createProductSchema(product, origin) {
  if (!product) return null;

  const productUrl = toAbsoluteUrl(`/product/${product.slug || product.id}`, origin);
  const images = (Array.isArray(product.images) ? product.images : [])
    .map((image) => normalizeImageUrl(image))
    .map((image) => toAbsoluteUrl(image, origin))
    .filter(Boolean);
  const price = Number(product.price);
  const inStock = Number(product.stock ?? 0) > 0;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name || "",
    description: product.description || "",
    url: productUrl,
    sku: product.internalCode || product.id || undefined,
    brand: {
      "@type": "Brand",
      name: "Tangerine",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: Number.isFinite(price) ? String(price) : "0",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (images.length > 0) {
    schema.image = images;
  }

  const ratingValue = getNumericField(product, [
    "ratingValue",
    "averageRating",
    "avgRating",
    "rating",
    "score",
  ]);
  const reviewCount = getNumericField(product, [
    "reviewCount",
    "ratingCount",
    "totalReviews",
    "reviewsCount",
  ]) ?? (Array.isArray(product.reviews) ? product.reviews.length : null);

  if (ratingValue !== null && reviewCount !== null) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
    };
  }

  return schema;
}
