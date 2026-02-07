'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Star, BadgeCheck, Quote } from 'lucide-react';

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  verified: boolean;
  avatar?: string;
}

interface TestimonialsSectionProps {
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    rating: 5,
    text: 'An absolutely unforgettable dining experience. The tasting menu was exquisite, and the wine pairings were perfectly selected. The staff made our anniversary truly special.',
    date: 'January 2026',
    verified: true,
  },
  {
    id: '2',
    name: 'James Rodriguez',
    rating: 5,
    text: "Best restaurant in the city, hands down. The attention to detail in every dish is remarkable. The chef's creativity shines through in every bite.",
    date: 'December 2025',
    verified: true,
  },
  {
    id: '3',
    name: 'Emily Chen',
    rating: 5,
    text: 'From the moment we walked in, we knew this would be special. The ambiance is elegant yet comfortable. Each course was a masterpiece of flavor and presentation.',
    date: 'January 2026',
    verified: true,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-semibold text-sm">
      {initials}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 p-8 h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-800/50">
      <div className="mb-4">
        <StarRating rating={testimonial.rating} />
      </div>

      <div className="relative flex-1">
        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-amber-200 dark:text-amber-900/30" />
        <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed italic font-serif pl-4">
          &ldquo;{testimonial.text}&rdquo;
        </p>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4">
          {testimonial.avatar ? (
            <div className="w-12 h-12 relative rounded-full overflow-hidden">
              <Image
                src={testimonial.avatar}
                alt={testimonial.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <InitialsAvatar name={testimonial.name} />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 dark:text-white">
                {testimonial.name}
              </h4>
              {testimonial.verified && (
                <BadgeCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {testimonial.date}
            </p>
          </div>
        </div>
        {testimonial.verified && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full">
            <BadgeCheck className="w-3 h-3" />
            Verified Diner
          </span>
        )}
      </div>
    </div>
  );
}

export default function TestimonialsSection({
  testimonials = defaultTestimonials,
}: TestimonialsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = useMemo(() => {
    return Math.max(0, testimonials.length - itemsPerView);
  }, [testimonials.length, itemsPerView]);

  useEffect(() => {
    if (isPaused || maxIndex === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused, maxIndex]);

  const handleDotClick = useCallback(
    (index: number) => {
      setCurrentIndex(Math.min(index, maxIndex));
    },
    [maxIndex]
  );

  const dotCount = useMemo(() => {
    return Math.max(1, testimonials.length - itemsPerView + 1);
  }, [testimonials.length, itemsPerView]);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl sm:text-5xl text-slate-900 dark:text-white mb-4">
            What Our Guests Say
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-amber-600 mx-auto rounded-full" />
        </div>

        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
            }}
          >
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className={`flex-shrink-0 ${
                  itemsPerView === 1
                    ? 'w-full'
                    : itemsPerView === 2
                    ? 'w-[calc(50%-12px)]'
                    : 'w-[calc(33.333%-16px)]'
                }`}
              >
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>
        </div>

        {dotCount > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {[...Array(dotCount)].map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-amber-500 w-8'
                    : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
