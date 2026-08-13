"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";

const emptyForm = { name: "", description: "", image: "" };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCategories(await api.getCategories());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(cat) {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || "", image: cat.image || "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCategory(editingId, form);
        toast.success("Category updated");
      } else {
        await api.createCategory(form);
        toast.success("Category created");
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
    if (!confirm("Delete this category? Products in it will keep the old category reference.")) return;
    try {
      await api.deleteCategory(id);
      toast.success("Category deleted");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">Categories</h1>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          {loading ? (
            <Spinner />
          ) : categories.length === 0 ? (
            <p className="text-ink/50 text-sm">No categories yet. Add your first one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-ink/10 text-xs uppercase tracking-widest text-ink/40">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Slug</th>
                  <th className="py-3 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">{c.name}</td>
                    <td className="py-3 pr-4 text-ink/50">{c.slug}</td>
                    <td className="py-3 pr-4 text-right space-x-4 whitespace-nowrap">
                      <button onClick={() => startEdit(c)} className="text-burgundy">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-ink/50 hover:text-burgundy">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h2 className="font-display text-xl mb-4">
            {editingId ? "Edit Category" : "Add Category"}
          </h2>
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
            <div className="flex gap-3">
              <Button type="submit" loading={saving}>
                {editingId ? "Save Changes" : "Add Category"}
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
    </div>
  );
}
