import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import PageHeader from "../../components/ui/PageHeader";
import { formatBlogDate } from "../../lib/blog";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../lib/image";
import { getRequestOrigin } from "../../SEO/schemaUtils";

export const dynamic = "force-dynamic";

function getApiBase() {
  return `${getRequestOrigin(headers())}/api`;
}

async function fetchJson(path) {
  const response = await fetch(`${getApiBase()}${path}`, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function getBlogImage(post) {
  const imageUrl = post?.imageUrl || post?.featuredImage || post?.image || post?.thumbnail || "";
  const normalized = normalizeImageUrl(imageUrl);
  return normalized || "/placeholder-category.svg";
}

function getBlogHref(post) {
  return `/blog/${post.slug || post.id}`;
}

function getBlogDate(post) {
  return formatBlogDate(post.publishedAt || post.createdAt || post.updatedAt);
}

function BlogCard({ post }) {
  const href = getBlogHref(post);
  const imageSrc = getBlogImage(post);
  const isDriveImage = isGoogleDriveImageUrl(post?.imageUrl || post?.featuredImage || post?.image || post?.thumbnail || "");
  const title = post?.title || "Untitled blog post";
  const date = getBlogDate(post);

  return (
    <article className="group bg-white">
      <Link href={href} className="block">
        <div className="relative aspect-[1.08] overflow-hidden bg-[#f4efe9]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={post?.imageAlt || title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              unoptimized={isDriveImage || /^https?:\/\//i.test(imageSrc)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f4efe9] to-[#f8f4ef] text-sm font-medium uppercase tracking-[0.28em] text-[#b7a99c]">
              Tangerine Blog
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-3 pt-4">
        <h2 className="text-[17px] font-semibold leading-[1.28] tracking-[-0.02em] text-[#171412] md:text-[18px]">
          <Link href={href} className="transition-colors duration-200 hover:text-[#c45a2a]">
            {title}
          </Link>
        </h2>

        {date ? <p className="text-[12px] uppercase tracking-[0.12em] text-[#b9b0a6]">{date}</p> : null}
      </div>
    </article>
  );
}

export default async function BlogPage() {
  let blogs = [];
  let loadError = "";

  try {
    const result = await fetchJson("/blogs");
    blogs = Array.isArray(result) ? result : [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load blog posts.";
  }

  return (
    <main className="min-h-screen bg-[#fffdfb] pb-20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Journal"
          title="The Tangerine Blog"
          description="Fresh style notes, brand stories, and editorial updates published straight from the admin panel."
        />

        <section>
          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {loadError}
            </div>
          ) : null}

          {!loadError && blogs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#ded4ca] bg-white px-6 py-16 text-center text-[#6f645c]">
              No blog posts yet. Add your first post from the admin Blog section and it will appear here
              automatically.
            </div>
          ) : null}

          {!loadError && blogs.length > 0 ? (
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
              {blogs.map((post) => (
                <BlogCard key={post?.id || post?._id || post?.slug || post?.title} post={post} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
