"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Carousel Context
interface CarouselContextType {
  currentIndex: number;
  goToSlide: (index: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  slidesCount: number;
}

const CarouselContext = createContext<CarouselContextType | null>(null);

function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a CarouselProvider");
  }
  return context;
}

// Slide data
const DEFAULT_SLIDES = [
  {
    id: "dining",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920",
    alt: "Elegant fine dining experience with beautifully plated dishes",
  },
  {
    id: "food",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920",
    alt: "Gourmet culinary creations with fresh ingredients",
  },
  {
    id: "interior",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920",
    alt: "Sophisticated restaurant interior with ambient lighting",
  },
];

// Slides Component
interface CarouselSlidesProps {
  slides?: typeof DEFAULT_SLIDES;
  className?: string;
}

function CarouselSlides({ slides = DEFAULT_SLIDES, className }: CarouselSlidesProps) {
  const { currentIndex } = useCarousel();
  const [isLoading, setIsLoading] = useState<boolean[]>(
    new Array(slides.length).fill(true)
  );

  const handleImageLoad = (index: number) => {
    setIsLoading((prev) => {
      const newState = [...prev];
      newState[index] = false;
      return newState;
    });
  };

  return (
    <>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-500 ease-in-out",
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${slides.length}`}
          aria-hidden={index !== currentIndex}
        >
          {/* Loading skeleton */}
          {isLoading[index] && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
          )}

          {/* Image */}
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={index === 0}
            className={cn(
              "object-cover transition-transform duration-700",
              index === currentIndex ? "scale-100" : "scale-105"
            )}
            sizes="100vw"
            onLoad={() => handleImageLoad(index)}
            quality={90}
          />

          {/* Gradient overlays for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-950/70 to-gray-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-gray-950/40" />
        </div>
      ))}
    </>
  );
}

// Dot Indicators Component
interface CarouselDotsProps {
  className?: string;
}

function CarouselDots({ className }: CarouselDotsProps) {
  const { currentIndex, goToSlide, slidesCount } = useCarousel();

  if (slidesCount <= 1) return null;

  return (
    <div
      className={cn("flex gap-2", className)}
      role="tablist"
      aria-label="Slide navigation"
    >
      {Array.from({ length: slidesCount }).map((_, index) => (
        <button
          key={index}
          onClick={() => goToSlide(index)}
          className={cn(
            "h-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900",
            index === currentIndex
              ? "bg-[#d4a853] w-8"
              : "bg-white/50 hover:bg-white/80 w-2.5"
          )}
          role="tab"
          aria-selected={index === currentIndex}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
}

// Content Overlay Component
interface CarouselContentProps {
  restaurantName?: string;
  tagline?: string;
  description?: string;
  cuisineType?: string;
  className?: string;
}

function CarouselContent({
  restaurantName,
  tagline,
  description,
  cuisineType,
  className,
}: CarouselContentProps) {
  return (
    <div className={cn("relative z-20 h-full flex items-center", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-3xl">
          {/* Cuisine Type Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a853]/20 border border-[#d4a853]/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#d4a853] animate-pulse" />
            <span className="text-sm font-medium text-[#d4a853] tracking-wide uppercase">
              {cuisineType || "Fine Dining Experience"}
            </span>
          </div>

          {/* Restaurant Name / Main Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            {tagline ? (
              tagline
            ) : restaurantName ? (
              <>
                Welcome to{" "}
                <span className="text-[#d4a853]">{restaurantName}</span>
              </>
            ) : (
              <>
                Taste the
                <span className="text-[#d4a853]"> Extraordinary</span>
              </>
            )}
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg sm:text-xl text-gray-200 leading-relaxed max-w-2xl">
            {description ||
              "Experience culinary artistry in an atmosphere of refined elegance. Our award-winning chefs craft unforgettable dishes using the finest seasonal ingredients."}
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/reservations" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 bg-[#d4a853] text-gray-950 hover:bg-[#c49a4b] font-semibold px-8 py-6 text-base shadow-lg shadow-[#d4a853]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#d4a853]/30 hover:-translate-y-0.5"
              >
                <Calendar className="h-5 w-5" />
                Reserve a Table
              </Button>
            </Link>
            <Link href="/menu" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto gap-2 border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-8 py-6 text-base font-semibold backdrop-blur-sm transition-all duration-300"
              >
                <UtensilsCrossed className="h-5 w-5" />
                View Our Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main HeroCarousel Component Props
interface HeroCarouselProps {
  restaurantName?: string;
  tagline?: string;
  description?: string;
  cuisineType?: string;
  slides?: typeof DEFAULT_SLIDES;
  autoPlayInterval?: number;
  className?: string;
  children?: ReactNode;
}

// Main HeroCarousel Component
export function HeroCarousel({
  restaurantName,
  tagline,
  description,
  cuisineType,
  slides = DEFAULT_SLIDES,
  autoPlayInterval = 5000,
  className,
  children,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minSwipeDistance = 50;

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  // Auto-advance
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isPaused, autoPlayInterval, goToNext, slides.length]);

  // Pause when tab not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const contextValue: CarouselContextType = {
    currentIndex,
    goToSlide,
    goToPrevious,
    goToNext,
    isPaused,
    setIsPaused,
    slidesCount: slides.length,
  };

  return (
    <CarouselContext.Provider value={contextValue}>
      <section
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden h-screen md:h-[70vh] min-h-[600px] max-h-[900px]",
          className
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-roledescription="carousel"
        aria-label="Restaurant showcase"
      >
        {children || (
          <>
            {/* Slides */}
            <CarouselSlides slides={slides} />

            {/* Content Overlay */}
            <CarouselContent
              restaurantName={restaurantName}
              tagline={tagline}
              description={description}
              cuisineType={cuisineType}
            />

            {/* Dot Indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
              <CarouselDots />
            </div>
          </>
        )}
      </section>
    </CarouselContext.Provider>
  );
}

// Compound Component Attachments
HeroCarousel.Slides = CarouselSlides;
HeroCarousel.Dots = CarouselDots;
HeroCarousel.Content = CarouselContent;

// Export compound components for advanced usage
export { CarouselSlides, CarouselDots, CarouselContent };
export default HeroCarousel;
