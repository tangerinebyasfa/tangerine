"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { normalizeImageUrl } from "../../../lib/image";

const emptyForm = {
  title: "",
  caption: "",
  instagramLink: "",
  imageUrl: "",
  imageAlt: "",
  sortOrder: 0,
};

export default function AdminGalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isEditing = !!editingId;

  async function load() {
    setLoading(true);
    try {
      setItems(await api.getGalleryItems());
    } catch (err) {
      console.error(err);
      setItems([]);
      toast.error(err.message || "Failed to load gallery items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orderedItems = useMemo(() => {
    return [...items].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  }, [items]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      caption: item.caption || "",
      instagramLink: item.instagramLink || "",
      imageUrl: item.imageUrl || "",
      imageAlt: item.imageAlt || "",
      sortOrder: Number(item.sortOrder ?? 0),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const imageUrl = normalizeImageUrl(form.imageUrl.trim());
      if (!imageUrl) {
        throw new Error("Please paste a Google Drive or direct image link for the gallery item.");
      }

      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim(),
        instagramLink: form.instagramLink.trim(),
        imageUrl,
        imageAlt: form.imageAlt.trim(),
        sortOrder: Number(form.sortOrder || 0),
      };

      if (isEditing) {
        await api.updateGalleryItem(editingId, payload);
        toast.success("Gallery item updated");
      } else {
        await api.createGalleryItem(payload);
        toast.success("Gallery item added");
      }

      resetForm();
      await load();
    } catch (err) {
      toast.error(err.message || "Could not save gallery item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm("Delete this gallery item?")) return;

    try {
      await api.deleteGalleryItem(item.id);
      if (editingId === item.id) resetForm();
      toast.success("Gallery item deleted");
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to delete gallery item");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Gallery Manager</h1>
      <p className="text-sm text-ink/60 mb-8">
        Paste a Google Drive or direct image link, attach an Instagram/post link, and control what
        appears on the public gallery page.
      </p>

      <div className="grid lg:grid-cols-[360px_1fr] gap-10">
        <div className="space-y-6">
          <div className="border border-ink/10 p-4 bg-paper">
            <h2 className="font-display text-xl mb-4">{isEditing ? "Edit Gallery Item" : "Add Gallery Item"}</h2>
            <form onSubmit={handleSubmit}>
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Input
                label="Caption"
                textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
              />
              <Input
                label="Instagram Link"
                type="url"
                placeholder="https://www.instagram.com/p/..."
                value={form.instagramLink}
                onChange={(e) => setForm({ ...form, instagramLink: e.target.value })}
              />
              <Input
                label="Image Link"
                type="url"
                placeholder="Paste a direct image URL or a Google Drive sharing link"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
              <Input
                label="Image Alt Text"
                value={form.imageAlt}
                onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
              />
              <Input
                label="Display Order"
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />

              {(form.imageUrl || form.title) && (
                <div className="mb-4 border border-ink/10 overflow-hidden bg-sand">
                  <div className="relative aspect-[4/5]">
                    <img
                      src={normalizeImageUrl(form.imageUrl) || "/placeholder-category.svg"}
                      alt={form.imageAlt || form.title || "Gallery preview"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" loading={saving}>
                  {isEditing ? "Save Changes" : "Add Item"}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <Spinner />
          ) : orderedItems.length === 0 ? (
            <p className="text-ink/50 text-sm">No gallery items yet. Add your first post from the left panel.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {orderedItems.map((item) => (
                <div key={item.id} className="border border-ink/10 bg-paper overflow-hidden">
                  <div className="relative aspect-[4/5] bg-sand">
                    <img
                      src={normalizeImageUrl(item.imageUrl) || "/placeholder-category.svg"}
                      alt={item.imageAlt || item.title || "Gallery image"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-xl">{item.title}</p>
                        <p className="text-[11px] tracking-widest uppercase text-ink/40 mt-1">
                          Order {item.sortOrder ?? 0}
                        </p>
                      </div>
                      {item.instagramLink ? (
                        <a
                          href={item.instagramLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs tracking-widest uppercase text-burgundy"
                        >
                          View Link
                        </a>
                      ) : null}
                    </div>
                    {item.caption && <p className="mt-3 text-sm leading-6 text-ink/60">{item.caption}</p>}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-xs tracking-widest uppercase text-ink/70 hover:text-burgundy"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="text-xs tracking-widest uppercase text-burgundy hover:text-ink"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
