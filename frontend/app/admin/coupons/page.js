"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { formatINR } from "../../../lib/currency";

const emptyForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minimumOrderValue: "",
  expiresAt: "",
  usageLimit: "",
  perUserLimit: "",
  scope: "storewide",
  productIds: "",
  categorySlugs: "",
  active: true,
};

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    try {
      const [couponItems, productItems, categoryItems] = await Promise.all([
        api.getCoupons(),
        api.getProducts(),
        api.getSubcategories(),
      ]);
      setCoupons(Array.isArray(couponItems) ? couponItems : []);
      setProducts(Array.isArray(productItems) ? productItems : []);
      setCategories(Array.isArray(categoryItems) ? categoryItems : []);
    } catch (error) {
      toast.error(error.message || "Unable to load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(coupon) {
    setEditingId(coupon.id);
    setForm({
      ...emptyForm,
      ...coupon,
      expiresAt: dateInputValue(coupon.expiresAt),
      productIds: Array.isArray(coupon.productIds) ? coupon.productIds.join(", ") : "",
      categorySlugs: Array.isArray(coupon.categorySlugs) ? coupon.categorySlugs.join(", ") : "",
      usageLimit: coupon.usageLimit ?? "",
      perUserLimit: coupon.perUserLimit ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        minimumOrderValue: form.minimumOrderValue === "" ? 0 : Number(form.minimumOrderValue),
        usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
        perUserLimit: form.perUserLimit === "" ? null : Number(form.perUserLimit),
        productIds: form.productIds,
        categorySlugs: form.categorySlugs,
      };
      if (editingId) {
        await api.updateCoupon(editingId, payload);
        toast.success("Coupon updated");
      } else {
        await api.createCoupon(payload);
        toast.success("Coupon created");
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error(error.message || "Unable to save coupon");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon) {
    try {
      await api.updateCoupon(coupon.id, { ...coupon, active: !coupon.active });
      toast.success(coupon.active ? "Coupon deactivated" : "Coupon activated");
      load();
    } catch (error) {
      toast.error(error.message || "Unable to update coupon");
    }
  }

  async function deleteCoupon(coupon) {
    if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    try {
      await api.deleteCoupon(coupon.id);
      toast.success("Coupon deleted");
      load();
    } catch (error) {
      toast.error(error.message || "Unable to delete coupon");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-tangerine">Promotion Tools</p>
        <h1 className="font-display text-4xl text-ink">Coupons</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Create controlled discounts that are checked again on the server when an order is placed.</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="border border-ink/10 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{editingId ? "Edit Coupon" : "Create Coupon"}</h2>
            {editingId ? <button type="button" onClick={resetForm} className="text-xs uppercase tracking-widest text-ink/50">Cancel</button> : null}
          </div>
          <Input label="Coupon Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
          <div className="grid grid-cols-2 gap-3">
            <label className="mb-4 block"><span className="mb-2 block text-xs uppercase tracking-widest text-ink/60">Discount Type</span><select className="input-field" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
            <Input label={form.discountType === "percentage" ? "Percent" : "Amount (INR)"} type="number" min="0" step="0.01" required value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
          </div>
          <Input label="Minimum Order (INR)" type="number" min="0" step="0.01" value={form.minimumOrderValue} onChange={(e) => setForm({ ...form, minimumOrderValue: e.target.value })} />
          <Input label="Expiry Date" type="datetime-local" required value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <div className="grid grid-cols-2 gap-3"><Input label="Total Uses" type="number" min="0" step="1" placeholder="Unlimited" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} /><Input label="Uses / User" type="number" min="0" step="1" placeholder="Unlimited" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} /></div>
          <label className="mb-4 block"><span className="mb-2 block text-xs uppercase tracking-widest text-ink/60">Applies To</span><select className="input-field" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}><option value="storewide">Entire store</option><option value="products">Specific products</option><option value="categories">Specific categories</option></select></label>
          {form.scope === "products" ? <Input label="Product IDs (comma separated)" required value={form.productIds} onChange={(e) => setForm({ ...form, productIds: e.target.value })} placeholder={products.slice(0, 2).map((p) => p.id).join(", ")} /> : null}
          {form.scope === "categories" ? <Input label="Category slugs (comma separated)" required value={form.categorySlugs} onChange={(e) => setForm({ ...form, categorySlugs: e.target.value })} placeholder={categories.slice(0, 2).map((c) => c.slug).join(", ")} /> : null}
          <label className="mb-5 flex items-center gap-3 text-sm text-ink/70"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active coupon</label>
          <Button type="submit" loading={saving} className="w-full">{editingId ? "Save Coupon" : "Create Coupon"}</Button>
        </form>

        <div className="min-w-0">
          {loading ? <Spinner /> : coupons.length === 0 ? <div className="border border-dashed border-ink/15 p-8 text-sm text-ink/55">No coupons created yet.</div> : <div className="overflow-x-auto border border-ink/10 bg-white"><table className="w-full min-w-[780px] text-sm"><thead><tr className="border-b border-ink/10 text-left text-xs uppercase tracking-widest text-ink/40"><th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-ink/10">{coupons.map((coupon) => <tr key={coupon.id} className={!coupon.active ? "opacity-50" : ""}><td className="px-4 py-4"><p className="font-semibold tracking-widest">{coupon.code}</p><p className="mt-1 text-xs text-ink/50">{coupon.active ? "Active" : "Inactive"}</p></td><td className="px-4 py-4">{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatINR(coupon.discountValue)}<p className="mt-1 text-xs text-ink/50">Min {formatINR(coupon.minimumOrderValue || 0)}</p></td><td className="px-4 py-4 capitalize">{coupon.scope}</td><td className="px-4 py-4">{coupon.usedCount || 0} / {coupon.usageLimit ?? "∞"}</td><td className="px-4 py-4 text-ink/60">{new Date(coupon.expiresAt).toLocaleString()}</td><td className="whitespace-nowrap px-4 py-4 text-right"><button type="button" onClick={() => startEdit(coupon)} className="mr-3 text-tangerine">Edit</button><button type="button" onClick={() => toggleCoupon(coupon)} className="mr-3 text-ink/60">{coupon.active ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => deleteCoupon(coupon)} className="text-rose-600">Delete</button></td></tr>)}</tbody></table></div>}
        </div>
      </div>
    </div>
  );
}
