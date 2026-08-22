import { headers } from "next/headers";
import { getProduct, getProducts, getSubcategory } from "../../../lib/firestoreServer";
import StructuredData from "../../../SEO/StructuredData";
import { getRequestOrigin } from "../../../SEO/schemaUtils";
import { createBreadcrumbSchema } from "../../../SEO/breadcrumbSchema";
import { createProductSchema } from "../../../SEO/productSchema";
import ProductDetailClient from "./ProductDetailClient";

function toPlainValue(value) {
  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }

  if (value && typeof value === "object") {
    if (typeof value.toJSON === "function") {
      return toPlainValue(value.toJSON());
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toPlainValue(entry)])
    );
  }

  return value;
}

export default async function ProductPage({ params }) {
  const product = toPlainValue(await getProduct(params.id));
  const origin = getRequestOrigin(headers());

  const category = product?.categorySlug ? await getSubcategory(product.categorySlug).catch(() => null) : null;
  const relatedProducts = product?.categorySlug
    ? toPlainValue(
        (await getProducts({ category: product.categorySlug }))
          .filter((item) => item?.id !== product.id && item?.slug !== product.slug)
          .slice(0, 8)
      )
    : [];

  const schema = product
    ? [
        createProductSchema(product, origin),
        createBreadcrumbSchema(
          [
            { name: "Home", url: "/" },
            {
              name: category?.name || product.categorySlug || "Products",
              url: category?.slug ? `/products/${category.slug}` : "/products/all",
            },
            { name: product.name || "Product", url: `/product/${product.slug || product.id}` },
          ],
          origin
        ),
      ].filter(Boolean)
    : [];

  return (
    <>
      {schema.map((item, index) => (
        <StructuredData key={index} schema={item} />
      ))}
      <ProductDetailClient initialProduct={product} relatedProducts={relatedProducts} />
    </>
  );
}
