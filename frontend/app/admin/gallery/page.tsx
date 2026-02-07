'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { SafeImage } from '@/components/safe-image';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useGalleryImages,
  useCreateImage,
  useUpdateImage,
  useDeleteImage,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdminGalleryImage } from '@/lib/admin-api';

const imageSchema = z.object({
  alt_text: z.string().min(1, 'Alt text is required for accessibility'),
});

type ImageFormData = z.infer<typeof imageSchema>;

export default function GalleryPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(true);
  const { data: imagesData, isLoading: isImagesLoading } = useGalleryImages();
  const createImage = useCreateImage();
  const updateImage = useUpdateImage();
  const deleteImage = useDeleteImage();

  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const form = useForm<ImageFormData>({
    resolver: zodResolver(imageSchema),
  });
  
  // Cleanup object URL to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);
  
  // Revoke previous URL when file changes
  useEffect(() => {
    if (uploadingFile && showUploadForm) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = URL.createObjectURL(uploadingFile);
    }
  }, [uploadingFile, showUploadForm]);

  if (isAuthLoading || isImagesLoading) {
    return <Loading fullScreen />;
  }

  const images = imagesData?.images || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      setShowUploadForm(true);
    }
  };

  const handleUpload = async (data: ImageFormData) => {
    if (!uploadingFile) return;

    const formData = new FormData();
    formData.append('image', uploadingFile);
    formData.append('alt_text', data.alt_text);
    formData.append('is_published', 'true');

    await createImage.mutateAsync(formData);
    setShowUploadForm(false);
    setUploadingFile(null);
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdate = async (id: string, data: ImageFormData) => {
    await updateImage.mutateAsync({ id, data });
    setEditingImage(null);
    form.reset();
  };

  const handleTogglePublish = async (image: AdminGalleryImage) => {
    await updateImage.mutateAsync({
      id: image.id,
      data: { is_published: !image.is_published },
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      await deleteImage.mutateAsync(id);
    }
  };

  const startEdit = (image: AdminGalleryImage) => {
    setEditingImage(image.id);
    form.setValue('alt_text', image.alt_text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gallery Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and manage gallery images
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && uploadingFile && previewUrlRef.current && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Upload Image</h3>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <div className="relative h-48 w-full">
                <Image
                  src={previewUrlRef.current}
                  alt="Preview"
                  fill
                  className="rounded-lg object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
            <form
              onSubmit={form.handleSubmit(handleUpload)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Alt Text <span className="text-red-500">*</span>
                </label>
                <input
                  {...form.register('alt_text')}
                  placeholder="Describe the image for accessibility"
                  className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {form.formState.errors.alt_text && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.alt_text.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createImage.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createImage.isPending ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setUploadingFile(null);
                    form.reset();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            No images yet. Upload your first image!
          </p>
        ) : (
          images.map((image) => (
            <div
              key={image.id}
              className="group overflow-hidden rounded-lg border bg-card shadow-sm"
            >
              <div className="relative aspect-square">
                {image.url ? (
                  <SafeImage
                    src={image.url}
                    alt={image.alt_text}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <span className="text-muted-foreground">No image</span>
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute left-2 top-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      image.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {image.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                {/* Actions Overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleTogglePublish(image)}
                    className="rounded-lg bg-card p-2 text-foreground hover:bg-muted"
                    title={image.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {image.is_published ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(image)}
                    className="rounded-lg bg-card p-2 text-foreground hover:bg-muted"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="rounded-lg bg-card p-2 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {editingImage === image.id ? (
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      handleUpdate(image.id, data)
                    )}
                    className="space-y-2"
                  >
                    <input
                      {...form.register('alt_text')}
                      className="w-full rounded border border-input px-2 py-1 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={updateImage.isPending}
                        className="text-xs text-green-600 hover:text-green-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingImage(null);
                          form.reset();
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {image.alt_text}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
