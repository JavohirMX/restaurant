import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ArrowLeft, BookOpen } from "lucide-react";
import { getBlogPost, getRestaurantInfo } from "@/lib/api";
import { formatDate, generateJsonLd } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  try {
    const post = await getBlogPost(params.slug);
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        type: "article",
        publishedTime: post.published_at,
        images: post.cover_image_url ? [post.cover_image_url] : undefined,
      },
    };
  } catch {
    return {
      title: "Blog Post",
      description: "Read our latest article",
    };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  let post;
  let restaurant;

  try {
    post = await getBlogPost(params.slug);
    restaurant = await getRestaurantInfo();
  } catch {
    notFound();
  }

  const jsonLd = generateJsonLd("BlogPosting", {
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image_url,
    datePublished: post.published_at,
    author: {
      "@type": "Organization",
      name: restaurant?.name || "Restaurant",
    },
    publisher: {
      "@type": "Organization",
      name: restaurant?.name || "Restaurant",
    },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <article className="min-h-screen bg-background-secondary">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Blog
            </Link>
          </div>
        </div>

        {/* Hero Image */}
        {post.cover_image_url && (
          <div className="relative h-64 sm:h-80 lg:h-96 bg-muted">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Meta */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.published_at}>
                {formatDate(post.published_at)}
              </time>
            </div>

            {/* Title */}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Body */}
            <div
              className="prose prose-lg prose-gray dark:prose-invert mx-auto mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body_html) }}
            />


          </div>
        </div>

        {/* Navigation */}
        <div className="border-t bg-card">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-sm font-medium text-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to all posts
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
