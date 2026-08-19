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

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

const emptyForm = {
  name: "",
  description: "",
  sizeGuide: "",
  additionalInfo: [{ label: "", value: "" }],
  sizeOptions: DEFAULT_SIZES.map((size) => ({ label: size, available: false })),
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
        sizeGuide: initialProduct.sizeGuide || "",
        additionalInfo:
          Array.isArray(initialProduct.additionalInfo) && initialProduct.additionalInfo.length > 0
            ? initialProduct.additionalInfo.map((item) => ({
                label: item.label || "",
                value: item.value || "",
              }))
            : [{ label: "", value: "" }],
        sizeOptions:
          Array.isArray(initialProduct.sizeOptions) && initialProduct.sizeOptions.length > 0
            ? DEFAULT_SIZES.map((size) => {
                const existing = initialProduct.sizeOptions.find((item) => item?.label === size);
                if (existing) {
                  return { label: size, available: !!existing.available };
                }
                return { label: size, available: Array.isArray(initialProduct.sizes) && initialProduct.sizes.includes(size) };
              })
            : DEFAULT_SIZES.map((size) => ({
                label: size,
                available: Array.isArray(initialProduct.sizes) && initialProduct.sizes.includes(size),
              })),
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

  function updateAdditionalInfoRow(index, key, value) {
    setForm((current) => ({
      ...current,
      additionalInfo: current.additionalInfo.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row
      ),
    }));
  }

  function addAdditionalInfoRow() {
    setForm((current) => ({
      ...current,
      additionalInfo: [...current.additionalInfo, { label: "", value: "" }],
    }));
  }

  function removeAdditionalInfoRow(index) {
    setForm((current) => ({
      ...current,
        additionalInfo:
          current.additionalInfo.length > 1
            ? current.additionalInfo.filter((_, rowIndex) => rowIndex !== index)
            : [{ label: "", value: "" }],
    }));
  }

  function toggleSizeOption(sizeLabel) {
    setForm((current) => ({
      ...current,
      sizeOptions: current.sizeOptions.map((item) =>
        item.label === sizeLabel ? { ...item, available: !item.available } : item
      ),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const category = categories.find((c) => c.id === form.categoryId);
      const payload = {
        name: form.name,
        description: form.description,
        sizeGuide: form.sizeGuide,
        additionalInfo: form.additionalInfo
          .map((item) => ({
            label: item.label.trim(),
            value: item.value.trim(),
          }))
          .filter((item) => item.label || item.value),
        sizeOptions: form.sizeOptions,
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
        sizes: form.sizeOptions.filter((item) => item.available).map((item) => item.label),
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
        label="Size Guide"
        textarea
        value={form.sizeGuide}
        onChange={(e) => setForm({ ...form, sizeGuide: e.target.value })}
      />
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="block text-xs tracking-widest uppercase text-ink/60">Additional Information</span>
          <button
            type="button"
            onClick={addAdditionalInfoRow}
            className="text-xs tracking-widest uppercase text-burgundy"
          >
            Add Row
          </button>
        </div>

        <div className="border border-ink/20 bg-paper">
          <div className="grid grid-cols-[1fr_1.5fr_auto] text-[11px] tracking-widest uppercase text-ink/50 border-b border-ink/10">
            <div className="px-3 py-2">Label</div>
            <div className="px-3 py-2 border-l border-ink/10">Value</div>
            <div className="px-3 py-2 border-l border-ink/10">Action</div>
          </div>
          <div className="divide-y divide-ink/10">
            {form.additionalInfo.map((row, index) => (
              <div key={`${index}-${row.label}`} className="grid grid-cols-[1fr_1.5fr_auto]">
                <input
                  value={row.label}
                  onChange={(e) => updateAdditionalInfoRow(index, "label", e.target.value)}
                  placeholder="e.g. Fabric"
                  className="w-full min-w-0 border-0 px-3 py-3 text-sm focus:outline-none"
                />
                <input
                  value={row.value}
                  onChange={(e) => updateAdditionalInfoRow(index, "value", e.target.value)}
                  placeholder="e.g. 100% Cotton"
                  className="w-full min-w-0 border-0 px-3 py-3 text-sm focus:outline-none border-l border-ink/10"
                />
                <button
                  type="button"
                  onClick={() => removeAdditionalInfoRow(index)}
                  className="border-l border-ink/10 px-3 py-3 text-xs tracking-widest uppercase text-burgundy"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
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
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="block text-xs tracking-widest uppercase text-ink/60">Sizes</span>
          <span className="text-[11px] tracking-widest uppercase text-ink/40">Select available sizes</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {form.sizeOptions.map((item) => {
            const active = item.available;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => toggleSizeOption(item.label)}
                className={`relative border px-3 py-3 text-sm tracking-wide transition-colors ${
                  active ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink/35"
                }`}
              >
                <span className={`${active ? "" : "line-through decoration-ink/45"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
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
