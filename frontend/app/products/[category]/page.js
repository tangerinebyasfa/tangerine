"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import ProductCard from "../../../components/product/ProductCard";
import PageHeader from "../../../components/ui/PageHeader";
import Spinner from "../../../components/ui/Spinner";

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
        const [productList, info] = await Promise.all([
          api.getProducts(isAll ? {} : { category }),
          isAll ? Promise.resolve(null) : api.getCategory(category).catch(() => null),
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

  const title = category === "all" ? "All Products" : categoryInfo?.name || category;

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageHeader
        eyebrow="Shop"
        title={title}
        description={categoryInfo?.description || "Browse the full range from this edit."}
      />

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="text-ink/50 text-sm">No products found in this category yet.</p>
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
