import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { getBlogPosts, getRestaurantInfo } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const restaurant = await getRestaurantInfo();
    return {
      title: "Blog",
      description: `Latest news, recipes, and stories from ${restaurant.name}`,
    };
  } catch {
    return {
      title: "Blog",
      description: "Latest news and stories from our restaurant",
    };
  }
}

export default async function BlogPage() {
  let posts;
  let restaurant;

  try {
    posts = await getBlogPosts();
    restaurant = await getRestaurantInfo();
  } catch {
    posts = null;
    restaurant = null;
  }

  const blogPosts = posts?.posts || [];

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Blog
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Welcome to our blog! Discover the latest news, behind-the-scenes stories, 
            recipes, and culinary insights from {restaurant?.name || "our kitchen"}.
          </p>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {blogPosts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No posts yet</h3>
            <p className="mt-2 text-muted-foreground">Check back soon for our latest articles.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="group flex flex-col overflow-hidden rounded-lg bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <Link href={`/blog/${post.slug}`} className="relative aspect-[16/9] overflow-hidden bg-muted">
                  {post.cover_image_url ? (
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.published_at}>
                      {formatDate(post.published_at)}
                    </time>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-foreground group-hover:text-foreground">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 text-muted-foreground line-clamp-3">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-foreground hover:text-foreground"
                  >
                    Read more
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination - simplified for now */}
        {posts?.next && (
          <div className="mt-12 text-center">
            <button className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
