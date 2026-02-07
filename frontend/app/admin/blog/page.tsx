'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useBlogPosts,
  useCreatePost,
  useDeletePost,
  usePublishPost,
  useUnpublishPost,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AdminBlogPost } from '@/lib/admin-api';

interface BlogFormData {
  title: string;
  slug: string;
  body_html: string;
}

export default function BlogPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(true);
  const { data: postsData, isLoading: isPostsLoading } = useBlogPosts();
  const createPost = useCreatePost();
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();
  const unpublishPost = useUnpublishPost();

  const [showForm, setShowForm] = useState(false);

  const form = useForm<BlogFormData>({
    defaultValues: {
      title: '',
      slug: '',
      body_html: '',
    },
  });

  if (isAuthLoading || isPostsLoading) {
    return <Loading fullScreen />;
  }

  const posts = postsData?.posts || [];

  const handleCreate = async (data: BlogFormData) => {
    await createPost.mutateAsync({
      title: data.title,
      slug: data.slug,
      body_html: data.body_html,
    });
    setShowForm(false);
    form.reset();
  };

  const handleTogglePublish = async (post: AdminBlogPost) => {
    if (post.is_published) {
      await unpublishPost.mutateAsync(post.id);
    } else {
      await publishPost.mutateAsync(post.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost.mutateAsync(id);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage blog posts
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">New Blog Post</h3>
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground">
                Title
              </label>
              <input
                {...form.register('title')}
                onChange={(e) => {
                  form.setValue('title', e.target.value);
                  form.setValue('slug', generateSlug(e.target.value));
                }}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Slug
              </label>
              <input
                {...form.register('slug')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="post-url-slug"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Content (HTML)
              </label>
              <textarea
                {...form.register('body_html')}
                rows={10}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 font-mono text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="<p>Your post content...</p>"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createPost.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createPost.isPending ? 'Creating...' : 'Create Draft'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  form.reset();
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground">No blog posts yet</p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between rounded-lg border bg-card p-6 shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{post.title}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      post.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {post.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">/{post.slug}</p>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  {post.published_at && (
                    <span>
                      Published: {new Date(post.published_at).toLocaleDateString()}
                    </span>
                  )}
                  <span>
                    Created: {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {post.is_published && (
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="rounded p-2 text-muted-foreground hover:bg-muted"
                    title="View on site"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
                <button
                  onClick={() => handleTogglePublish(post)}
                  className="rounded p-2 text-muted-foreground hover:bg-muted"
                  title={post.is_published ? 'Unpublish' : 'Publish'}
                >
                  {post.is_published ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="rounded p-2 text-muted-foreground hover:bg-muted"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
