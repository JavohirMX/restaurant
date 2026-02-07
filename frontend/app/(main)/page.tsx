import Link from "next/link";
import Image from "next/image";
import { SafeImage } from "@/components/safe-image";
import { Metadata } from "next";
import { ArrowRight, Calendar, UtensilsCrossed, Star, Quote, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCarousel, CarouselSlides, CarouselDots } from "@/components/hero-carousel";
import TestimonialsSection from "@/components/testimonials-section";
import { getRestaurantInfo, getTestimonials, getMenu, getGallery } from "@/lib/api";
import { generateJsonLd } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const restaurant = await getRestaurantInfo();
    return {
      title: restaurant.tagline || `Welcome to ${restaurant.name}`,
      description: restaurant.description,
      openGraph: {
        title: restaurant.name,
        description: restaurant.description,
        type: "website",
      },
    };
  } catch {
    return {
      title: "Welcome",
      description: "Fine dining experience",
    };
  }
}

const heroSlides = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80",
    alt: "Exquisite plated fine dining dish with artistic presentation",
    caption: "Culinary Excellence",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920&q=80",
    alt: "Elegant restaurant interior with warm ambient lighting",
    caption: "Unforgettable Ambiance",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1920&q=80",
    alt: "Chef preparing gourmet dish with precision",
    caption: "Masterful Craftsmanship",
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1920&q=80",
    alt: "Premium wine selection with elegant glassware",
    caption: "Curated Wine Collection",
  },
];

export default async function HomePage() {
  let restaurant;
  let testimonials;
  let menu;
  let gallery;

  try {
    restaurant = await getRestaurantInfo();
    testimonials = await getTestimonials();
    menu = await getMenu();
    gallery = await getGallery();
  } catch {
    restaurant = null;
    testimonials = null;
    menu = null;
    gallery = null;
  }

  const featuredItems = menu?.categories?.[0]?.items?.slice(0, 3) || [];
  const featuredTestimonials = testimonials?.testimonials?.slice(0, 3) || [];
  const aboutImage = gallery?.images?.[0]?.url || heroSlides[1].image;

  const jsonLd = restaurant
    ? generateJsonLd("Restaurant", {
        name: restaurant.name,
        description: restaurant.description,
        image: restaurant.branding?.logo_url,
        telephone: restaurant.phone,
        email: restaurant.email,
        address: restaurant.location
          ? {
              "@type": "PostalAddress",
              streetAddress: restaurant.location.address_line1,
              addressLocality: restaurant.location.city,
              addressRegion: restaurant.location.region,
              postalCode: restaurant.location.postal_code,
              addressCountry: restaurant.location.country,
            }
          : undefined,
        url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      })
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}

      {/* Hero Section - uses HeroCarousel with children to avoid duplicate overlays */}
      <HeroCarousel
        slides={heroSlides}
        autoPlayInterval={5000}
      >
        {/* Background Slides */}
        <CarouselSlides slides={heroSlides} />

        {/* Single Content Overlay */}
        <div className="relative z-20 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-3xl">
              {/* Tagline */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a853]/20 border border-[#d4a853]/30 mb-6 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-[#d4a853] animate-pulse" />
                <span className="text-sm font-medium text-[#d4a853] tracking-wide uppercase">
                  {restaurant?.tagline || "Fine Dining Experience"}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1] animate-fade-in-up">
                Taste the
                <span className="text-[#d4a853]"> Extraordinary</span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-lg sm:text-xl text-gray-200 leading-relaxed max-w-2xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {restaurant?.description ||
                  "Experience culinary artistry in an atmosphere of refined elegance. Our award-winning chefs craft unforgettable dishes using the finest seasonal ingredients."}
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
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

              {/* Social Proof */}
              <div className="mt-12 flex items-center gap-6 text-white/80 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 border-2 border-gray-900"
                      />
                    ))}
                  </div>
                  <span className="text-sm">
                    <span className="font-semibold text-white">2,000+</span> happy diners
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-[#d4a853] text-[#d4a853]" />
                  ))}
                  <span className="ml-1 text-sm">
                    <span className="font-semibold text-white">4.9</span> rating
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
          <CarouselDots />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-2 text-white/60 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </HeroCarousel>

      {/* Featured Menu Items - Enhanced Styling */}
      {featuredItems.length > 0 && (
        <section className="py-20 sm:py-28 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto scroll-fade-in is-visible">
              <span className="text-accent text-sm font-semibold tracking-wide uppercase">
                Our Menu
              </span>
              <h2 className="mt-3 text-4xl sm:text-5xl font-serif font-bold text-foreground">
                Featured Dishes
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Discover our chef&apos;s selection of signature creations
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featuredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative bg-card rounded-2xl overflow-hidden shadow-lg shadow-accent/5 hover:shadow-xl hover:shadow-accent/10 transition-all duration-500 hover:-translate-y-2 border border-border/50 scroll-fade-in is-visible"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative h-64 bg-muted overflow-hidden">
                    {item.photos?.[0]?.url ? (
                      <>
                        <div className="absolute inset-0 bg-muted animate-pulse group-hover:opacity-0 transition-opacity duration-300" />
                        <Image
                          src={item.photos[0].url}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          priority={index === 0}
                        />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <UtensilsCrossed className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors duration-500" />
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1.5 bg-card/95 backdrop-blur-sm rounded-full text-sm font-semibold text-foreground shadow-sm border border-accent/20">
                        {item.variants?.[0]?.price_display || ""}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {item.tags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-serif font-semibold text-foreground group-hover:text-accent transition-colors duration-300">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  {/* Gold accent border on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              ))}
            </div>

            <div className="mt-12 text-center scroll-fade-in is-visible">
              <Link href="/menu">
                <Button
                  variant="outline"
                  className="gap-2 border-2 border-border hover:border-accent hover:text-accent px-6 py-5 transition-all duration-300"
                >
                  View Full Menu
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About Teaser Section */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image */}
              <div className="relative scroll-fade-in is-visible">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-accent/10">
                <SafeImage
                  src={aboutImage}
                  fallbackSrc={heroSlides[1].image}
                  alt={`${restaurant?.name || "Restaurant"} interior`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/10 rounded-2xl -z-10" />
              <div className="absolute -top-6 -left-6 w-24 h-24 border-2 border-accent/20 rounded-2xl -z-10" />
            </div>

            {/* Content */}
            <div className="scroll-fade-in is-visible">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-12 bg-accent" />
                <span className="text-accent text-sm font-semibold tracking-wide uppercase">
                  About Us
                </span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight">
                Where Culinary Art
                <span className="text-accent"> Meets Passion</span>
              </h2>
              
              <div className="mt-6 space-y-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  {restaurant?.description || 
                    "Nestled in the heart of the city, our restaurant has been serving exceptional cuisine for over a decade. We believe that dining is not just about food—it's an experience that engages all your senses."}
                </p>
                <p>
                  Our talented team of chefs sources only the finest seasonal ingredients, working closely with local farmers and artisan producers to bring you dishes that celebrate flavor, creativity, and sustainability.
                </p>
              </div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">10+</div>
                  <div className="text-sm text-muted-foreground">Years</div>
                </div>
                <div className="text-center border-x border-border">
                  <div className="text-3xl font-bold text-accent">50+</div>
                  <div className="text-sm text-muted-foreground">Dishes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">4.9</div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/about">
                  <Button
                    variant="outline"
                    className="gap-2 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground px-6 py-5 transition-all duration-300"
                  >
                    Learn More About Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Using TestimonialsSection Component */}
      {featuredTestimonials.length > 0 && (
        <TestimonialsSection
          testimonials={featuredTestimonials.map((t) => ({
            id: t.id,
            name: t.name,
            rating: t.rating,
            text: t.text,
            date: new Date().toISOString(),
            verified: true,
          }))}
        />
      )}

      {/* Read More Reviews Button */}
      {featuredTestimonials.length > 0 && (
        <section className="pb-20 sm:pb-28 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center scroll-fade-in is-visible">
              <Link href="/about#testimonials">
                <Button
                  variant="ghost"
                  className="gap-2 text-accent hover:text-accent/80 hover:bg-accent/10 px-6"
                >
                  Read More Reviews
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Enhanced with Background Pattern */}
      <section className="py-24 sm:py-32 bg-primary relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} 
          />
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10" />
        
        {/* Decorative circles */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center scroll-fade-in is-visible">
            {/* Decorative icon */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent" />
              <Quote className="w-8 h-8 text-accent" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent" />
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-primary-foreground leading-tight">
              Ready to Experience
              <span className="text-accent"> Fine Dining?</span>
            </h2>
            
            <p className="mt-6 text-xl text-primary-foreground/70 leading-relaxed max-w-2xl mx-auto">
              Reserve your table today and embark on a culinary journey like no other. 
              Our dedicated team is ready to make your visit truly memorable.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/reservations" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-10 py-7 text-lg shadow-xl shadow-accent/20 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/30 hover:-translate-y-1"
                >
                  <Calendar className="h-5 w-5" />
                  Reserve a Table
                </Button>
              </Link>
              <Link href="/menu" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto gap-2 border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50 px-10 py-7 text-lg font-semibold backdrop-blur-sm transition-all duration-300"
                >
                  <UtensilsCrossed className="h-5 w-5" />
                  View Menu
                </Button>
              </Link>
            </div>

            {/* Location info */}
            {restaurant?.location && (
              <div className="mt-12 flex items-center justify-center gap-2 text-primary-foreground/60">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">
                  {restaurant.location.address_line1}, {restaurant.location.city}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

    </>
  );
}
