"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import ProductCard from "../../../components/product/ProductCard";
import PageHeader from "../../../components/ui/PageHeader";
import Spinner from "../../../components/ui/Spinner";

const MAIN_TYPES = ["accessories", "clothes", "footwear"];

const TYPE_COPY = {
  accessories: {
    title: "Accessories",
    description: "Browse all accessories from the current edit.",
  },
  clothes: {
    title: "Clothes",
    description: "Browse all clothing pieces from the current edit.",
  },
  footwear: {
    title: "Footwear",
    description: "Browse all footwear from the current edit.",
  },
};

export default function CategoryPage() {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const isAll = category === "all";
        const isMainType = MAIN_TYPES.includes(category);
        const [productList, info] = await Promise.all([
          api.getProducts(
            isAll ? {} : isMainType ? { type: category } : { category }
          ),
          isAll || isMainType ? Promise.resolve(null) : api.getSubcategory(category).catch(() => null),
        ]);
        setProducts(productList);
        setCategoryInfo(info);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  const isMainType = MAIN_TYPES.includes(category);
  const typeCopy = TYPE_COPY[category];
  const title =
    category === "all" ? "All Products" : categoryInfo?.name || typeCopy?.title || category;
  const description =
    category === "all"
      ? "Browse the full range from this edit."
      : categoryInfo?.description || typeCopy?.description || "Browse the full range from this edit.";

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader
        eyebrow="Shop"
        title={title}
        description={description}
      />

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="text-ink/50 text-sm">
          No products found in this {isMainType ? "type" : "category"} yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
