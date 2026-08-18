"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

const PRODUCT_TYPES = [
  { value: "accessories", label: "Accessories" },
  { value: "clothes", label: "Clothes" },
  { value: "footwear", label: "Footwear" },
];

const emptyForm = {
  name: "",
  description: "",
  image: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState("accessories");

  async function load() {
    setLoading(true);
    try {
      setCategories(await api.getSubcategories());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groupedCategories = useMemo(
    () =>
      PRODUCT_TYPES.reduce((acc, type) => {
        acc[type.value] = categories.filter((category) => category.parentType === type.value);
        return acc;
      }, {}),
    [categories]
  );

  function startEdit(cat) {
    setEditingId(cat.id);
    setSelectedType(cat.parentType || "accessories");
    setForm({
      name: cat.name || "",
      description: cat.description || "",
      image: cat.image || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        parentType: selectedType,
      };

      if (editingId) {
        await api.updateSubcategory(editingId, payload);
        toast.success("Subtype updated");
      } else {
        await api.createSubcategory(payload);
        toast.success("Subtype created");
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this subtype? Products using it will keep the old reference.")) return;
    try {
      await api.deleteSubcategory(id);
      toast.success("Subtype deleted");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  }

  const currentList = groupedCategories[selectedType] || [];

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Product Types</h1>

      <div className="grid lg:grid-cols-[340px_1fr] gap-10">
        <div className="space-y-6">
          <div className="border border-ink/10 p-4 bg-paper">
            <p className="text-xs tracking-widest uppercase text-ink/40 mb-4">Main Types</p>
            <div className="flex flex-col gap-2">
              {PRODUCT_TYPES.map((type) => {
                const active = selectedType === type.value;
                const count = groupedCategories[type.value]?.length || 0;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center justify-between px-4 py-3 text-left border transition-colors ${
                      active ? "border-ink bg-ink text-paper" : "border-ink/10 hover:bg-sand"
                    }`}
                  >
                    <span className="text-sm uppercase tracking-widest">{type.label}</span>
                    <span className="text-xs opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <p className="text-xs tracking-widest uppercase text-ink/40 mb-3">
                {PRODUCT_TYPES.find((type) => type.value === selectedType)?.label} Subtypes
              </p>
              {currentList.length === 0 ? (
                <p className="text-sm text-ink/50">No subtypes added yet.</p>
              ) : (
                <div className="space-y-2">
                  {currentList.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between gap-3 border-b border-ink/10 pb-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate">{category.name}</p>
                        <p className="text-[11px] uppercase tracking-widest text-ink/40">{category.slug}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="text-xs uppercase tracking-widest text-burgundy"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category.id)}
                          className="text-xs uppercase tracking-widest text-ink/50 hover:text-burgundy"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-ink/10 p-4 bg-paper">
            <h2 className="font-display text-xl mb-4">
              {editingId ? "Edit Subtype" : `Add ${PRODUCT_TYPES.find((t) => t.value === selectedType)?.label || "Subtype"}`}
            </h2>
            <p className="text-xs tracking-widest uppercase text-ink/40 mb-4">
              Current type: {PRODUCT_TYPES.find((t) => t.value === selectedType)?.label}
            </p>

            <form onSubmit={handleSubmit}>
              <Input
                label="Name"
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
                label="Image URL"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />

              <label className="block mb-4">
                <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Product Type</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="input-field"
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-3">
                <Button type="submit" loading={saving}>
                  {editingId ? "Save Changes" : "Add Subtype"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-8">
          {loading ? (
            <Spinner />
          ) : categories.length === 0 ? (
            <p className="text-ink/50 text-sm">No subtypes yet. Add your first one from the left panel.</p>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                {PRODUCT_TYPES.map((type) => (
                  <div key={type.value} className="border border-ink/10 p-4">
                    <p className="text-xs tracking-widest uppercase text-ink/40 mb-2">{type.label}</p>
                    <p className="font-display text-2xl">{groupedCategories[type.value]?.length || 0}</p>
                    <p className="text-sm text-ink/50 mt-2">Connected subtypes in Firebase</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto border border-ink/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-ink/10 text-xs uppercase tracking-widest text-ink/40">
                      <th className="py-3 px-4">Subtype</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="py-3 px-4">{category.name}</td>
                        <td className="py-3 px-4 capitalize text-ink/60">
                          {category.parentType || "Unassigned"}
                        </td>
                        <td className="py-3 px-4 text-ink/50">{category.slug}</td>
                        <td className="py-3 px-4 text-right space-x-4 whitespace-nowrap">
                          <button onClick={() => startEdit(category)} className="text-burgundy">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(category.id)} className="text-ink/50 hover:text-burgundy">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
