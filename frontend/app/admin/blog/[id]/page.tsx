'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/admin-auth';
import { useBlogPost, useUpdatePost } from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

interface BlogEditFormData {
  title: string;
  slug: string;
  body_html: string;
  seo_title: string;
  seo_description: string;
}

export default function BlogEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { isLoading: isAuthLoading } = useRequireAuth(true);
  const { data: post, isLoading: isPostLoading } = useBlogPost(id);
  const updatePost = useUpdatePost();

  const form = useForm<BlogEditFormData>({
    defaultValues: {
      title: '',
      slug: '',
      body_html: '',
      seo_title: '',
      seo_description: '',
    },
  });

  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        slug: post.slug,
        body_html: post.body_html,
        seo_title: post.seo?.title || '',
        seo_description: post.seo?.description || '',
      });
    }
  }, [post, form]);

  if (isAuthLoading || isPostLoading) {
    return <Loading fullScreen />;
  }

  if (!post) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Post not found</p>
        <Link
          href="/admin/blog"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to Blog
        </Link>
      </div>
    );
  }

  const handleSubmit = async (data: BlogEditFormData) => {
    await updatePost.mutateAsync({
      id,
      data: {
        title: data.title,
        slug: data.slug,
        body_html: data.body_html,
        seo: {
          title: data.seo_title,
          description: data.seo_description,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Post</h1>
            <p className="text-sm text-muted-foreground">{post.title}</p>
          </div>
        </div>
        <button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={updatePost.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {updatePost.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <form className="space-y-6">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Content</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Title
              </label>
              <input
                {...form.register('title')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Slug
              </label>
              <input
                {...form.register('slug')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Content (HTML)
              </label>
              <textarea
                {...form.register('body_html')}
                rows={20}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 font-mono text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">SEO</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                SEO Title
              </label>
              <input
                {...form.register('seo_title')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Override page title for SEO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                SEO Description
              </label>
              <textarea
                {...form.register('seo_description')}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Meta description for search engines"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
