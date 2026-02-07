'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import { SafeImage } from "@/components/safe-image";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getGallery } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";

export default function GalleryPage() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: gallery, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.gallery,
    queryFn: getGallery,
  });

  const images = gallery?.images || [];

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'unset';
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Attach keyboard navigation at document level while lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, currentIndex, images.length]);

  // Ensure body scroll is restored if component unmounts while lightbox is open
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (isLoading) {
    return <Loading message="Loading gallery..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load gallery"
        message="There was an error loading the gallery. Please try again."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Gallery
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Take a visual journey through our restaurant. From our elegant dining 
            space to our exquisite dishes, experience the ambiance that awaits you.
          </p>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {images.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No images yet</h3>
            <p className="mt-2 text-muted-foreground">Check back soon for photos of our restaurant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label={`View image: ${image.alt_text || 'Gallery image'}`}
              >
                <SafeImage
                  src={image.url}
                  alt={image.alt_text || 'Gallery image'}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="flex h-full items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-full max-w-full">
              <SafeImage
                src={images[currentIndex].url}
                alt={images[currentIndex].alt_text || 'Gallery image'}
                width={1200}
                height={800}
                className="max-h-[85vh] w-auto object-contain"
                priority
              />
              {images[currentIndex].alt_text && (
                <p className="mt-4 text-center text-white/80">
                  {images[currentIndex].alt_text}
                </p>
              )}
            </div>
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
