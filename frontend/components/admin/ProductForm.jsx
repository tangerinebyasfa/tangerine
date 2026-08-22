"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { normalizeImageUrl } from "../../lib/image";
import Input from "../ui/Input";
import Button from "../ui/Button";

const PRODUCT_TYPES = [
  { value: "accessories", label: "Accessories" },
  { value: "clothes", label: "Clothes" },
  { value: "footwear", label: "Footwear" },
];

const emptyForm = {
  name: "",
  slug: "",
  internalCode: "",
  description: "",
  images: "",
  price: "",
  compareAtPrice: "",
  stock: 0,
  productType: "accessories",
  categorySlug: "",
  sizes: "",
  colors: "",
  sizeGuide: "",
  materials: "",
  washCare: "",
  deliveryInfo: "",
  additionalInfo: "",
  featured: false,
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toCommaList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAdditionalInfo(value) {
  if (!value) return [];

  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return { label: line, value: "" };
      }

      const label = line.slice(0, separatorIndex).trim();
      const entryValue = line.slice(separatorIndex + 1).trim();
      return { label, value: entryValue };
    })
    .filter((row) => row.label || row.value);
}

function formatAdditionalInfo(rows = []) {
  return rows
    .filter((row) => row?.label || row?.value)
    .map((row) => `${row.label || ""}${row.value ? `: ${row.value}` : ""}`.trim())
    .join("\n");
}
function toTextValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? "" : String(item)))
      .filter(Boolean)
      .join("\n");
  }

  if (value == null) return "";
  return String(value);
}

function trimText(value) {
  return toTextValue(value).trim();
}

function normalizeForm(product = null) {
  if (!product) return { ...emptyForm };

  return {
    name: product.name || "",
    slug: product.slug || "",
    internalCode: product.internalCode || "",
    description: product.description || "",
    images: Array.isArray(product.images) ? product.images.join(", ") : product.images || "",
    price: product.price ?? "",
    compareAtPrice: product.compareAtPrice ?? "",
    stock: Number(product.stock ?? 0),
    productType: product.productType || product.categoryParentType || "accessories",
    categorySlug: product.categorySlug || "",
    sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : "",
    colors: Array.isArray(product.colors) ? product.colors.join(", ") : "",
    sizeGuide: toTextValue(product.sizeGuide),
    materials: toTextValue(product.materials),
    washCare: toTextValue(product.washCare),
    deliveryInfo: toTextValue(product.deliveryInfo),
    additionalInfo: formatAdditionalInfo(Array.isArray(product.additionalInfo) ? product.additionalInfo : []),
    featured: !!product.featured,
  };
}

export default function ProductForm({ initialProduct = null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => normalizeForm(initialProduct));
  const [saving, setSaving] = useState(false);
  const [subtypes, setSubtypes] = useState([]);
  const isEditing = !!initialProduct?.id;

  useEffect(() => {
    setForm(normalizeForm(initialProduct));
  }, [initialProduct]);

  useEffect(() => {
    (async () => {
      try {
        const categories = await api.getSubcategories();
        setSubtypes(categories);
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Failed to load product types");
      }
    })();
  }, []);

  const subtypeOptions = useMemo(
    () => subtypes.filter((item) => (item.parentType || "") === form.productType),
    [subtypes, form.productType]
  );

  useEffect(() => {
    if (form.categorySlug && subtypeOptions.some((option) => option.slug === form.categorySlug)) {
      return;
    }

    if (subtypeOptions.length > 0) {
      setForm((current) => ({
        ...current,
        categorySlug: subtypeOptions[0].slug || "",
      }));
    } else if (form.categorySlug) {
      setForm((current) => ({ ...current, categorySlug: "" }));
    }
    // We intentionally react only to subtype changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtypeOptions]);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload() {
    const images = toCommaList(form.images).map((image) => normalizeImageUrl(image)).filter(Boolean);
    const sizes = toCommaList(form.sizes);
    const colors = toCommaList(form.colors);
    const additionalInfo = parseAdditionalInfo(form.additionalInfo);

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      internalCode: form.internalCode.trim(),
      description: form.description.trim(),
      images,
      price: Number(form.price || 0),
      compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice),
      stock: Number(form.stock || 0),
      productType: form.productType,
      categoryParentType: form.productType,
      categorySlug: form.categorySlug,
      sizes,
      colors,
      sizeGuide: trimText(form.sizeGuide),
      materials: trimText(form.materials),
      washCare: trimText(form.washCare),
      deliveryInfo: trimText(form.deliveryInfo),
      additionalInfo,
      featured: !!form.featured,
    };

    if (payload.compareAtPrice === null || Number.isNaN(payload.compareAtPrice)) {
      delete payload.compareAtPrice;
    }

    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = buildPayload();

      if (!payload.name) {
        throw new Error("Please enter a product name.");
      }

      if (!payload.images.length) {
        throw new Error("Please add at least one product image URL.");
      }

      if (Number.isNaN(payload.price) || payload.price < 0) {
        throw new Error("Please enter a valid product price.");
      }

      if (Number.isNaN(payload.stock) || payload.stock < 0) {
        throw new Error("Please enter a valid stock amount.");
      }

      if (isEditing) {
        await api.updateProduct(initialProduct.id, payload);
        toast.success("Product updated");
      } else {
        await api.createProduct(payload);
        toast.success("Product created");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  const imagePreview = toCommaList(form.images)
    .map((image) => normalizeImageUrl(image))
    .filter(Boolean);

  return (
    <div className="grid gap-8 xl:grid-cols-[360px_1fr]">
      <div className="border border-ink/10 bg-paper p-5">
        <h2 className="font-display text-xl mb-2">{isEditing ? "Edit Product" : "Create Product"}</h2>
        <p className="text-sm text-ink/55 mb-5">
          Add the fields that power the product grid, product page, and admin inventory view.
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="Product Name"
            required
            value={form.name}
            onChange={(e) => {
              const nextName = e.target.value;
              setForm((current) => ({
                ...current,
                name: nextName,
                slug: current.slug || slugify(nextName),
              }));
            }}
          />
          <Input
            label="Slug"
            placeholder="auto-generated from name if left blank"
            value={form.slug}
            onChange={(e) => handleChange("slug", e.target.value)}
          />
          <Input
            label="Internal Code"
            placeholder="SKU / product code"
            value={form.internalCode}
            onChange={(e) => handleChange("internalCode", e.target.value)}
          />
          <Input
            label="Description"
            textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
          <Input
            label="Image URLs"
            textarea
            placeholder="Paste comma-separated image URLs"
            value={form.images}
            onChange={(e) => handleChange("images", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              min="0"
              step="1"
              required
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
            />
            <Input
              label="Compare At Price"
              type="number"
              min="0"
              step="1"
              value={form.compareAtPrice}
              onChange={(e) => handleChange("compareAtPrice", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => handleChange("stock", e.target.value)}
            />
            <label className="block mb-4">
              <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Featured</span>
              <select
                value={form.featured ? "yes" : "no"}
                onChange={(e) => handleChange("featured", e.target.value === "yes")}
                className="input-field"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block mb-4">
              <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Product Type</span>
              <select
                value={form.productType}
                onChange={(e) => handleChange("productType", e.target.value)}
                className="input-field"
              >
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
                value={form.categorySlug}
                onChange={(e) => handleChange("categorySlug", e.target.value)}
                className="input-field"
              >
                <option value="">Select subtype</option>
                {subtypeOptions.map((subtype) => (
                  <option key={subtype.id} value={subtype.slug}>
                    {subtype.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Input
            label="Sizes"
            placeholder="XS, S, M, L"
            value={form.sizes}
            onChange={(e) => handleChange("sizes", e.target.value)}
          />
          <Input
            label="Colors"
            placeholder="Black, Ivory, Beige"
            value={form.colors}
            onChange={(e) => handleChange("colors", e.target.value)}
          />
          <Input
            label="Size Guide"
            textarea
            value={form.sizeGuide}
            onChange={(e) => handleChange("sizeGuide", e.target.value)}
          />
          <Input
            label="Materials"
            textarea
            value={form.materials}
            onChange={(e) => handleChange("materials", e.target.value)}
          />
          <Input
            label="Wash Care"
            textarea
            value={form.washCare}
            onChange={(e) => handleChange("washCare", e.target.value)}
          />
          <Input
            label="Delivery Info"
            textarea
            value={form.deliveryInfo}
            onChange={(e) => handleChange("deliveryInfo", e.target.value)}
          />
          <Input
            label="Additional Info"
            textarea
            placeholder="Fabric: Cotton\nFit: Relaxed"
            value={form.additionalInfo}
            onChange={(e) => handleChange("additionalInfo", e.target.value)}
          />

          <div className="flex gap-3">
            <Button type="submit" loading={saving}>
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="border border-ink/10 bg-paper p-5">
          <h3 className="font-display text-xl mb-4">Preview</h3>
          {imagePreview.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {imagePreview.map((src, index) => (
                <div key={`${src}-${index}`} className="overflow-hidden border border-ink/10 bg-sand">
                  <div className="aspect-[4/5]">
                    <img
                      src={src}
                      alt={form.name || `Preview image ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/50">Add one or more image URLs to see a preview.</p>
          )}
        </div>

        <div className="border border-ink/10 bg-paper p-5">
          <h3 className="font-display text-xl mb-4">Saved Shape</h3>
          <div className="space-y-2 text-sm text-ink/65">
            <p>
              <span className="text-ink/40 uppercase tracking-widest text-xs">Type:</span>{" "}
              {PRODUCT_TYPES.find((type) => type.value === form.productType)?.label || "Unassigned"}
            </p>
            <p>
              <span className="text-ink/40 uppercase tracking-widest text-xs">Subtype:</span>{" "}
              {subtypeOptions.find((subtype) => subtype.slug === form.categorySlug)?.name || "Unassigned"}
            </p>
            <p>
              <span className="text-ink/40 uppercase tracking-widest text-xs">Images:</span>{" "}
              {toCommaList(form.images).length}
            </p>
            <p>
              <span className="text-ink/40 uppercase tracking-widest text-xs">Sizes:</span>{" "}
              {toCommaList(form.sizes).join(", ") || "None"}
            </p>
            <p>
              <span className="text-ink/40 uppercase tracking-widest text-xs">Colors:</span>{" "}
              {toCommaList(form.colors).join(", ") || "None"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

