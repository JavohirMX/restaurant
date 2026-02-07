'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { Plus, Edit2, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AdminTestimonial } from '@/lib/admin-api';

interface TestimonialFormData {
  name: string;
  rating: number;
  text: string;
  is_published: boolean;
  sort_order: number;
}

export default function TestimonialsPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(true);
  const { data: testimonialsData, isLoading: isTestimonialsLoading } = useTestimonials();
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();

  const [editingTestimonial, setEditingTestimonial] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<TestimonialFormData>({
    defaultValues: {
      name: '',
      rating: 5,
      text: '',
      is_published: true,
      sort_order: 0,
    },
  });

  if (isAuthLoading || isTestimonialsLoading) {
    return <Loading fullScreen />;
  }

  const testimonials = testimonialsData?.testimonials || [];

  const handleCreate = async (data: TestimonialFormData) => {
    await createTestimonial.mutateAsync(data);
    setShowForm(false);
    form.reset({ rating: 5, is_published: true });
  };

  const handleUpdate = async (id: string, data: TestimonialFormData) => {
    await updateTestimonial.mutateAsync({ id, data });
    setEditingTestimonial(null);
    form.reset({ rating: 5, is_published: true });
  };

  const handleTogglePublish = async (testimonial: AdminTestimonial) => {
    await updateTestimonial.mutateAsync({
      id: testimonial.id,
      data: { is_published: !testimonial.is_published },
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this testimonial?')) {
      await deleteTestimonial.mutateAsync(id);
    }
  };

  const startEdit = (testimonial: AdminTestimonial) => {
    setEditingTestimonial(testimonial.id);
    form.setValue('name', testimonial.name);
    form.setValue('rating', testimonial.rating);
    form.setValue('text', testimonial.text);
    form.setValue('is_published', testimonial.is_published);
  };

  const StarRating = ({ rating, onChange, readOnly = false }: { rating: number; onChange?: (r: number) => void; readOnly?: boolean }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readOnly && onChange?.(star)}
            disabled={readOnly}
            className={readOnly ? '' : 'hover:scale-110 transition-transform'}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-muted text-muted'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage customer testimonials and reviews
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Testimonial
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">New Testimonial</h3>
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground">
                Customer Name
              </label>
              <input
                {...form.register('name')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="John Doe"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Rating
              </label>
              <div className="mt-1">
                <StarRating
                  rating={form.watch('rating')}
                  onChange={(r) => form.setValue('rating', r)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Testimonial
              </label>
              <textarea
                {...form.register('text')}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Share your experience..."
              />
              {form.formState.errors.text && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.text.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register('is_published')}
                id="is_published"
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <label htmlFor="is_published" className="text-sm text-foreground">
                Publish immediately
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createTestimonial.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createTestimonial.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  form.reset({ rating: 5, is_published: true });
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Testimonials List */}
      <div className="space-y-4">
        {testimonials.length === 0 ? (
          <p className="text-center text-muted-foreground">No testimonials yet</p>
        ) : (
          testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              {editingTestimonial === testimonial.id ? (
                <form
                  onSubmit={form.handleSubmit((data) =>
                    handleUpdate(testimonial.id, data)
                  )}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Customer Name
                    </label>
                    <input
                      {...form.register('name')}
                      className="mt-1 block w-full rounded-lg border border-input px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Rating
                    </label>
                    <div className="mt-1">
                      <StarRating
                        rating={form.watch('rating')}
                        onChange={(r) => form.setValue('rating', r)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Testimonial
                    </label>
                    <textarea
                      {...form.register('text')}
                      rows={4}
                      className="mt-1 block w-full rounded-lg border border-input px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register('is_published')}
                      id={`edit_is_published_${testimonial.id}`}
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <label htmlFor={`edit_is_published_${testimonial.id}`} className="text-sm text-foreground">
                      Published
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={updateTestimonial.isPending}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {updateTestimonial.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTestimonial(null);
                        form.reset();
                      }}
                      className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          {testimonial.name}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            testimonial.is_published
                              ? 'bg-green-100 text-green-800'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {testimonial.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="mt-1">
                        <StarRating rating={testimonial.rating} readOnly />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePublish(testimonial)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted"
                        title={testimonial.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {testimonial.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(testimonial)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(testimonial.id)}
                        className="rounded p-2 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-muted-foreground">{testimonial.text}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
