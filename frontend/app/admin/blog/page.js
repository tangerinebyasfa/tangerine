"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import Spinner from "../../../components/ui/Spinner";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { createBlogExcerpt, formatBlogDate, slugify } from "../../../lib/blog";
import { normalizeImageUrl } from "../../../lib/image";

const emptyForm = {
  title: "",
  slug: "",
  content: "",
  imageUrl: "",
  imageAlt: "",
};

function sortBlogPosts(items) {
  return [...items].sort((a, b) => {
    const aTime = a.publishedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? new Date(a.publishedAt || a.createdAt || 0).getTime();
    const bTime = b.publishedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? new Date(b.publishedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export default function AdminBlogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isEditing = !!editingId;
  const generatedSlug = slugify(form.title);
  const previewImage = normalizeImageUrl(form.imageUrl) || "/placeholder-category.svg";

  async function load() {
    setLoading(true);
    try {
      const data = await api.getBlogs();
      const nextItems = Array.isArray(data) ? data : [];
      setItems(sortBlogPosts(nextItems));
    } catch (err) {
      console.error(err);
      setItems([]);
      toast.error(err.message || "Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const orderedItems = useMemo(() => sortBlogPosts(items), [items]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      slug: item.slug || slugify(item.title),
      content: item.content || "",
      imageUrl: item.imageUrl || "",
      imageAlt: item.imageAlt || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const title = form.title.trim();
      const content = form.content.trim();
      const imageUrl = normalizeImageUrl(form.imageUrl.trim());
      const slug = slugify(form.slug || title);

      if (!title) throw new Error("Please enter a blog title.");
      if (!content) throw new Error("Please enter blog content.");
      if (!imageUrl) throw new Error("Please paste a Google Drive or direct image link for the blog image.");

      const payload = {
        title,
        slug,
        content,
        excerpt: createBlogExcerpt(content, 220),
        imageUrl,
        imageAlt: form.imageAlt.trim() || title,
      };

      if (isEditing) {
        await api.updateBlog(editingId, payload);
        toast.success("Blog post updated");
      } else {
        await api.createBlog(payload);
        toast.success("Blog post added");
      }

      resetForm();
      await load();
    } catch (err) {
      toast.error(err.message || "Could not save blog post");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm("Delete this blog post?")) return;

    try {
      await api.deleteBlog(item.id);
      if (editingId === item.id) resetForm();
      toast.success("Blog post deleted");
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to delete blog post");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Blog Manager</h1>
      <p className="text-sm text-ink/60 mb-8">
        Add editorial posts here. The publish date is set automatically, the slug is generated from the title,
        and the public blog pages will update from the backend API.
      </p>

      <div className="grid lg:grid-cols-[380px_1fr] gap-10">
        <div className="space-y-6">
          <div className="border border-ink/10 p-4 bg-paper">
            <h2 className="font-display text-xl mb-4">{isEditing ? "Edit Blog Post" : "Add Blog Post"}</h2>
            <form onSubmit={handleSubmit}>
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    title: e.target.value,
                    slug: current.slug && isEditing ? current.slug : slugify(e.target.value),
                  }))
                }
              />

              <label className="block mb-4">
                <span className="block text-xs tracking-widest uppercase text-ink/60 mb-2">Slug</span>
                <input
                  value={isEditing ? form.slug : generatedSlug}
                  readOnly
                  className="w-full border border-ink/20 bg-sand px-4 py-3 text-sm text-ink/70"
                />
              </label>

              <Input
                label="Content"
                textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write the blog post content here. Use paragraphs separated by blank lines."
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
                placeholder="Optional, but recommended for SEO"
              />

              <p className="mb-4 text-xs leading-6 text-ink/45">
                Publish date is set automatically when you save a new post.
              </p>

              {(form.imageUrl || form.title) && (
                <div className="mb-4 border border-ink/10 overflow-hidden bg-sand">
                  <div className="relative aspect-[4/5]">
                    <img
                      src={previewImage}
                      alt={form.imageAlt || form.title || "Blog preview"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" loading={saving}>
                  {isEditing ? "Save Changes" : "Add Post"}
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
            <p className="text-ink/50 text-sm">No blog posts yet. Add your first article from the left panel.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {orderedItems.map((item) => {
                const image = normalizeImageUrl(item.imageUrl) || "/placeholder-category.svg";

                return (
                  <article key={item.id} className="border border-ink/10 bg-paper overflow-hidden">
                    <div className="relative aspect-[4/5] bg-sand">
                      <img
                        src={image}
                        alt={item.imageAlt || item.title || "Blog image"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] tracking-widest uppercase text-ink/40">
                        {formatBlogDate(item.publishedAt || item.createdAt)}
                      </p>
                      <p className="font-display text-xl mt-2">{item.title}</p>
                      <p className="mt-3 text-sm leading-6 text-ink/60">
                        {item.excerpt || createBlogExcerpt(item.content)}
                      </p>
                      <p className="mt-4 text-[11px] tracking-widest uppercase text-ink/35 break-all">
                        /blog/{item.slug || slugify(item.title)}
                      </p>
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
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
