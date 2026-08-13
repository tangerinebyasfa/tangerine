"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import Input from "../ui/Input";
import Button from "../ui/Button";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  compareAtPrice: "",
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
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialProduct) {
      setForm({
        name: initialProduct.name || "",
        description: initialProduct.description || "",
        price: initialProduct.price ?? "",
        compareAtPrice: initialProduct.compareAtPrice ?? "",
        categoryId: initialProduct.categoryId || "",
        stock: initialProduct.stock ?? "",
        images: (initialProduct.images || []).join(", "),
        sizes: (initialProduct.sizes || []).join(", "),
        colors: (initialProduct.colors || []).join(", "),
        featured: !!initialProduct.featured,
      });
    }
  }, [initialProduct]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const category = categories.find((c) => c.id === form.categoryId);
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        categoryId: form.categoryId,
        categorySlug: category?.slug || null,
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

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price ($)"
          type="number"
          step="0.01"
          required
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input
          label="Compare-at Price ($) — optional"
          type="number"
          step="0.01"
          value={form.compareAtPrice}
          onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
        />
      </div>

      <label className="block mb-4">
        <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Category</span>
        <select
          required
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="input-field"
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

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
