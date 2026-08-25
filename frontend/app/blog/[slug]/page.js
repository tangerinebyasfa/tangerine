import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "../../../components/ui/PageHeader";
import { createBlogExcerpt, formatBlogDate } from "../../../lib/blog";
import { isGoogleDriveImageUrl, normalizeImageUrl } from "../../../lib/image";
import { getBlog, getBlogs } from "../../../lib/firestoreServer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const post = await getBlog(params.slug).catch(() => null);

  if (!post) {
    return {
      title: "Blog Post Not Found | Tangerine",
    };
  }

  const description = post.excerpt || createBlogExcerpt(post.content, 155);
  const ogImage = normalizeImageUrl(post.imageUrl);

  return {
    title: `${post.title} | Tangerine Blog`,
    description,
    alternates: {
      canonical: `/blog/${post.slug || params.slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/blog/${post.slug || params.slug}`,
      images: ogImage
        ? [
            {
              url: ogImage,
              alt: post.imageAlt || post.title,
            },
          ]
        : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getBlog(params.slug).catch(() => null);

  if (!post) notFound();

  const related = await getBlogs().catch(() => []);
  const morePosts = related.filter((item) => item.id !== post.id).slice(0, 3);
  const publishedDate = post.publishedAt || post.createdAt;
  const canonicalUrl = `/blog/${post.slug || params.slug}`;
  const ogImage = normalizeImageUrl(post.imageUrl);
  const imageUrl = ogImage || "/placeholder-category.svg";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || createBlogExcerpt(post.content, 155),
    image: ogImage ? [ogImage] : undefined,
    datePublished: publishedDate?.toDate?.()?.toISOString?.() || undefined,
    dateModified: post.updatedAt?.toDate?.()?.toISOString?.() || publishedDate?.toDate?.()?.toISOString?.() || undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Tangerine",
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeader eyebrow="Blog" title={post.title} description={post.excerpt || createBlogExcerpt(post.content)} />

      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <article>
          <div className="flex items-center justify-between gap-4 mb-6 text-xs tracking-widest uppercase text-ink/40">
            <span>{formatBlogDate(publishedDate)}</span>
            <Link href="/blog" className="text-burgundy hover:text-ink transition-colors">
              Back to blog
            </Link>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden bg-sand border border-ink/10 mb-8">
            <Image
              src={imageUrl}
              alt={post.imageAlt || post.title || "Blog post image"}
              fill
              className="object-cover"
              priority
              unoptimized={isGoogleDriveImageUrl(post.imageUrl)}
            />
          </div>

          <div className="space-y-6 text-ink/70 leading-8 text-[17px]">
            {String(post.content || "")
              .split(/\n{2,}/)
              .map((paragraph, index) => {
                const text = paragraph.trim();
                if (!text) return null;
                return (
                  <p key={index} className="whitespace-pre-line">
                    {text}
                  </p>
                );
              })}
          </div>
        </article>

        <aside className="space-y-6 lg:pt-10">
          <div className="border border-ink/10 bg-sand/30 p-6">
            <p className="text-xs tracking-widest uppercase text-ink/40">Article details</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-ink/40 uppercase tracking-widest text-[11px]">Published</dt>
                <dd className="mt-1 text-ink/70">{formatBlogDate(publishedDate)}</dd>
              </div>
              <div>
                <dt className="text-ink/40 uppercase tracking-widest text-[11px]">URL</dt>
                <dd className="mt-1 text-ink/70 break-all">/blog/{post.slug || params.slug}</dd>
              </div>
            </dl>
          </div>

          {morePosts.length > 0 && (
            <div className="border border-ink/10 bg-paper p-6">
              <p className="text-xs tracking-widest uppercase text-ink/40 mb-4">More posts</p>
              <div className="space-y-4">
                {morePosts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/blog/${item.slug || item.id}`}
                    className="block group"
                  >
                    <p className="text-xs tracking-widest uppercase text-ink/40">
                      {formatBlogDate(item.publishedAt || item.createdAt)}
                    </p>
                    <p className="mt-1 font-display text-xl group-hover:text-burgundy transition-colors">
                      {item.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
