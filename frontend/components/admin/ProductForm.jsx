"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import Input from "../ui/Input";
import Button from "../ui/Button";

const PRODUCT_TYPES = [
  { value: "accessories", label: "Accessories" },
  { value: "clothes", label: "Clothes" },
  { value: "footwear", label: "Footwear" },
];

const emptyForm = {
  name: "",
  description: "",
  materials: "",
  washCare: "",
  deliveryInfo: "",
  price: "",
  compareAtPrice: "",
  productType: "",
  categoryId: "",
  stock: "",
  images: "",
  sizes: "",
  colors: "",
  featured: false,
};

export default function ProductForm({ initialProduct = null }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getSubcategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialProduct) {
      setForm({
        name: initialProduct.name || "",
        description: initialProduct.description || "",
        materials: initialProduct.materials || "",
        washCare: initialProduct.washCare || "",
        deliveryInfo: initialProduct.deliveryInfo || "",
        price: initialProduct.price ?? "",
        compareAtPrice: initialProduct.compareAtPrice ?? "",
        productType: initialProduct.productType || initialProduct.categoryParentType || "",
        categoryId: initialProduct.categoryId || "",
        stock: initialProduct.stock ?? "",
        images: (initialProduct.images || []).join(", "),
        sizes: (initialProduct.sizes || []).join(", "),
        colors: (initialProduct.colors || []).join(", "),
        featured: !!initialProduct.featured,
      });
    }
  }, [initialProduct]);

  useEffect(() => {
    if (!initialProduct || !categories.length || form.productType) return;

    const matchingCategory = categories.find((c) => c.id === initialProduct.categoryId);
    if (matchingCategory?.parentType) {
      setForm((current) => ({
        ...current,
        productType: matchingCategory.parentType,
      }));
    }
  }, [categories, form.productType, initialProduct]);

  const availableSubcategories = categories.filter((category) => category.parentType === form.productType);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const category = categories.find((c) => c.id === form.categoryId);
      const payload = {
        name: form.name,
        description: form.description,
        materials: form.materials,
        washCare: form.washCare,
        deliveryInfo: form.deliveryInfo,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        productType: form.productType,
        categoryId: form.categoryId,
        categorySlug: category?.slug || null,
        categoryParentType: category?.parentType || form.productType || null,
        stock: Number(form.stock) || 0,
        images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
        sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        colors: form.colors.split(",").map((s) => s.trim()).filter(Boolean),
        featured: form.featured,
      };

      if (initialProduct) {
        await api.updateProduct(initialProduct.id, payload);
        toast.success("Product updated");
      } else {
        await api.createProduct(payload);
        toast.success("Product created");
      }
      router.push("/admin/products");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Input
        label="Product Name"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        label="Description"
        textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <Input
        label="Materials"
        textarea
        value={form.materials}
        onChange={(e) => setForm({ ...form, materials: e.target.value })}
      />
      <Input
        label="Wash Care"
        textarea
        value={form.washCare}
        onChange={(e) => setForm({ ...form, washCare: e.target.value })}
      />
      <Input
        label="Delivery & Returns"
        textarea
        value={form.deliveryInfo}
        onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price (₹)"
          type="number"
          step="0.01"
          required
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input
          label="Compare-at Price (₹) — optional"
          type="number"
          step="0.01"
          value={form.compareAtPrice}
          onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
        />
      </div>

      <label className="block mb-4">
        <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Product Type</span>
        <select
          required
          value={form.productType}
          onChange={(e) =>
            setForm({
              ...form,
              productType: e.target.value,
              categoryId: "",
            })
          }
          className="input-field"
        >
          <option value="">Select a product type</option>
          {PRODUCT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block mb-4">
        <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Subtype</span>
        <select
          required
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="input-field"
          disabled={!form.productType}
        >
          <option value="">
            {form.productType ? "Select a subtype" : "Select a product type first"}
          </option>
          {availableSubcategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {form.productType && availableSubcategories.length === 0 && (
        <p className="text-xs text-ink/50 -mt-2 mb-4">
          No subtypes found for this type yet. Add them in the Categories admin page.
        </p>
      )}

      <Input
        label="Stock Quantity"
        type="number"
        required
        value={form.stock}
        onChange={(e) => setForm({ ...form, stock: e.target.value })}
      />

      <Input
        label="Image URLs (comma-separated, optional)"
        value={form.images}
        onChange={(e) => setForm({ ...form, images: e.target.value })}
      />
      <Input
        label="Sizes (comma-separated, e.g. S, M, L, XL)"
        value={form.sizes}
        onChange={(e) => setForm({ ...form, sizes: e.target.value })}
      />
      <Input
        label="Colors (comma-separated)"
        value={form.colors}
        onChange={(e) => setForm({ ...form, colors: e.target.value })}
      />

      <label className="flex items-center gap-2 mb-6 text-sm">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
        />
        Feature this product on the homepage
      </label>

      <Button type="submit" loading={loading}>
        {initialProduct ? "Save Changes" : "Create Product"}
      </Button>
    </form>
  );
}
