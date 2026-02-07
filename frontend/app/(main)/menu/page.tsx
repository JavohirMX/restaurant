"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  UtensilsCrossed,
  Search,
  X,
  Heart,
  Leaf,
  WheatOff,
  Flame,
  Info,
  ChevronDown,
  Sparkles,
  Plus,
  ChefHat,
  Star,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Types
interface MenuItemVariant {
  id: string;
  name: string;
  price_cents: number;
  price_display: string;
  sort_order: number;
}

interface MenuItemPhoto {
  url: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  photos: MenuItemPhoto[];
  sort_order: number;
  variants: MenuItemVariant[];
  is_featured?: boolean;
  allergens?: string[];
  preparation_time?: string;
  calories?: number;
}

interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

interface MenuData {
  categories: MenuCategory[];
}

interface RestaurantInfo {
  name: string;
  settings?: {
    timezone?: string;
  };
}

// Simplified dietary tag display with abbreviations
const DIETARY_TAGS: Record<string, { label: string; color: string; bgColor: string }> = {
  vegetarian: { label: "V", color: "text-green-700", bgColor: "bg-green-100" },
  vegan: { label: "VG", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  "gluten-free": { label: "GF", color: "text-amber-700", bgColor: "bg-amber-100" },
  gf: { label: "GF", color: "text-amber-700", bgColor: "bg-amber-100" },
  spicy: { label: "🌶️", color: "text-red-600", bgColor: "bg-red-50" },
  hot: { label: "🌶️", color: "text-red-600", bgColor: "bg-red-50" },
};

// Hook for intersection observer animations
function useIntersectionObserver(options?: IntersectionObserverInit) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.unobserve(element);
      }
    }, { threshold: 0.1, ...options });

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return { ref, isIntersecting };
}

// Dietary tag display component with abbreviations
function DietaryTag({ tag }: { tag: string }) {
  const tagLower = tag.toLowerCase();
  const config = DIETARY_TAGS[tagLower];
  
  if (!config) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded">
        {tag}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-semibold rounded",
        config.bgColor,
        config.color
      )}
      title={tag}
    >
      {config.label}
    </span>
  );
}

// Dish Card Component with Intersection Observer animations
function DishCard({
  item,
  currency,
  onQuickView,
  isFavorite,
  onToggleFavorite,
  index,
}: {
  item: MenuItem;
  currency: string;
  onQuickView: (item: MenuItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  index: number;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver();

  const hasImage = item.photos?.length > 0;
  const firstVariant = item.variants[0];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isIntersecting ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1, ease: "easeOut" }}
      className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container - 16:10 aspect ratio */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {/* Loading Skeleton */}
        {!imageLoaded && hasImage && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}

        {hasImage ? (
          <Image
            src={item.photos[0].url}
            alt={item.name}
            fill
            className={cn(
              "object-cover transition-transform duration-500 ease-out",
              isHovered && "scale-105"
            )}
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
            >
              <Button
                variant="outline"
                size="lg"
                className="bg-card/90 backdrop-blur-sm hover:bg-card text-foreground border-0"
                onClick={() => onQuickView(item)}
              >
                <Plus className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            )}
          />
        </button>

        {/* Featured Badge */}
        {item.is_featured && (
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-2">
          <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors">
            {item.name}
          </h3>
          {firstVariant && (
            <span className="text-lg font-bold text-foreground whitespace-nowrap">
              {formatCurrency(firstVariant.price_cents, currency)}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.description || "A delicious dish prepared with care and fresh ingredients."}
        </p>

        {/* Dietary Tags - Simplified abbreviations */}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.map((tag) => (
              <DietaryTag key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Variants */}
        {item.variants.length > 1 && (
          <div className="space-y-2 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">Available Options:</p>
            {item.variants.slice(0, 2).map((variant) => (
              <div key={variant.id} className="flex justify-between items-center text-sm">
                <span className="text-foreground line-clamp-1">{variant.name}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(variant.price_cents, currency)}
                </span>
              </div>
            ))}
            {item.variants.length > 2 && (
              <button
                onClick={() => onQuickView(item)}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                +{item.variants.length - 2} more options
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Quick View Modal
function QuickViewModal({
  item,
  isOpen,
  onClose,
  currency,
}: {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency: string;
}) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full md:max-h-[85vh] bg-card rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Image */}
            <div className="relative h-48 md:h-64 bg-muted flex-shrink-0">
              {item.photos?.[0]?.url ? (
                <Image
                  src={item.photos[0].url}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-lg"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              {/* Featured Badge */}
              {item.is_featured && (
                <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Featured
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground">{item.name}</h2>
                  {item.calories && (
                    <p className="text-sm text-muted-foreground mt-1">{item.calories} calories</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag) => (
                    <DietaryTag key={tag} tag={tag} />
                  ))}
                </div>
              )}

              {/* Description */}
              <p className="text-muted-foreground mb-6 leading-relaxed">{item.description}</p>

              {/* Variants */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <ChefHat className="w-4 h-4" />
                  Available Options
                </h4>
                {item.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-xl"
                  >
                    <span className="font-medium text-foreground">{variant.name}</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(variant.price_cents, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Category Tabs Component with exact styling requirements
function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  featuredCount,
}: {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  featuredCount: number;
}) {
  const scrollToCategory = (categoryName: string) => {
    onCategoryChange(categoryName);
    const element = document.getElementById(
      categoryName === "all" ? "menu-content" : `category-${categoryName.toLowerCase().replace(/\s+/g, "-")}`
    );
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-card border-b border-border py-4">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {/* All Tab */}
          <button
            onClick={() => scrollToCategory("all")}
            className={cn(
              "flex-shrink-0 px-5 py-2.5 rounded-full font-medium text-sm transition-all snap-start min-w-[44px] touch-manipulation whitespace-nowrap",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
              activeCategory === "all"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-muted text-foreground-secondary hover:bg-muted"
            )}
          >
            All
          </button>

          {/* Featured Tab */}
          {featuredCount > 0 && (
            <button
              onClick={() => scrollToCategory("featured")}
              className={cn(
                "flex-shrink-0 px-5 py-2.5 rounded-full font-medium text-sm transition-all snap-start min-w-[44px] touch-manipulation flex items-center gap-1.5 whitespace-nowrap",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
                activeCategory === "featured"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-muted text-foreground-secondary hover:bg-muted"
              )}
            >
              <Star className="w-3.5 h-3.5" />
              Featured
            </button>
          )}

          {/* Category Tabs */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.name)}
              className={cn(
                "flex-shrink-0 px-5 py-2.5 rounded-full font-medium text-sm transition-all snap-start min-w-[44px] touch-manipulation whitespace-nowrap",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
                activeCategory === category.name
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-muted text-foreground-secondary hover:bg-muted"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      {/* Tabs Skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-shrink-0 h-10 w-24 bg-muted rounded-full animate-pulse" />
        ))}
      </div>
      
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-card rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-[16/10] bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="font-serif text-2xl font-bold text-foreground mb-3">Menu coming soon</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Our culinary team is preparing something special. Check back soon to discover our delicious offerings.
      </p>
      <Button variant="outline" className="gap-2">
        <ChefHat className="w-4 h-4" />
        Contact Us
      </Button>
    </div>
  );
}

// Dietary Filter Pills
function DietaryFilters({
  selectedFilters,
  onToggleFilter,
}: {
  selectedFilters: string[];
  onToggleFilter: (filter: string) => void;
}) {
  const filters = [
    { id: "vegetarian", label: "Vegetarian", icon: Leaf, color: "text-green-600" },
    { id: "vegan", label: "Vegan", icon: Leaf, color: "text-emerald-600" },
    { id: "gluten-free", label: "Gluten-Free", icon: WheatOff, color: "text-amber-600" },
    { id: "spicy", label: "Spicy", icon: Flame, color: "text-red-500" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isSelected = selectedFilters.includes(filter.id);
        return (
          <button
            key={filter.id}
            onClick={() => onToggleFilter(filter.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "min-h-[36px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-foreground-secondary hover:bg-muted/80"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : filter.color)} />
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

// Featured Section with Intersection Observer
function FeaturedSection({
  items,
  currency,
  onQuickView,
  favorites,
  onToggleFavorite,
}: {
  items: MenuItem[];
  currency: string;
  onQuickView: (item: MenuItem) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const { ref, isIntersecting } = useIntersectionObserver();

  if (items.length === 0) return null;

  return (
    <section ref={ref} id="category-featured" className="scroll-mt-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isIntersecting ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="p-2 bg-amber-600 rounded-xl shadow-md">
          <Star className="w-5 h-5 text-white" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Featured</h2>
        <div className="flex-1 h-px bg-border" />
      </motion.div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <DishCard
            key={item.id}
            item={item}
            currency={currency}
            onQuickView={onQuickView}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={onToggleFavorite}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

// Main Menu Page Component
export default function MenuPage() {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [quickViewItem, setQuickViewItem] = useState<MenuItem | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("menu-favorites");
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem("menu-favorites", JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  // Fetch menu data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, restaurantRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/public/menu/`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"}/public/restaurant/info/`),
        ]);

        if (menuRes.ok) {
          const menu = await menuRes.json();
          setMenuData(menu);
        }
        if (restaurantRes.ok) {
          const rest = await restaurantRes.json();
          setRestaurant(rest);
        }
      } catch (error) {
        console.error("Failed to fetch menu data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Track active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("[id^='category-']");
      const scrollPosition = window.scrollY + 180;

      for (const section of Array.from(sections)) {
        const top = (section as HTMLElement).offsetTop;
        const height = (section as HTMLElement).offsetHeight;
        const id = section.id.replace("category-", "");

        if (scrollPosition >= top && scrollPosition < top + height) {
          if (id === "featured") {
            setActiveCategory("featured");
          } else {
            const category = menuData?.categories.find(
              (c) => c.name.toLowerCase().replace(/\s+/g, "-") === id
            );
            if (category) {
              setActiveCategory(category.name);
            }
          }
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuData]);

  // Filter functions
  const matchesSearch = useCallback(
    (item: MenuItem) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    },
    [searchQuery]
  );

  const matchesDietaryFilters = useCallback(
    (item: MenuItem) => {
      if (dietaryFilters.length === 0) return true;
      return dietaryFilters.every((filter) =>
        item.tags.some((tag) => tag.toLowerCase().includes(filter.toLowerCase()))
      );
    },
    [dietaryFilters]
  );

  const toggleDietaryFilter = useCallback((filter: string) => {
    setDietaryFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  }, []);

  // Derived data
  const currency = useMemo(
    () => (restaurant?.settings?.timezone?.includes("EUR") ? "EUR" : "USD"),
    [restaurant]
  );

  const filteredCategories = useMemo(() => {
    if (!menuData) return [];
    return menuData.categories.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => matchesSearch(item) && matchesDietaryFilters(item)
      ),
    }));
  }, [menuData, matchesSearch, matchesDietaryFilters]);

  const featuredItems = useMemo(() => {
    const items: MenuItem[] = [];
    menuData?.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.is_featured && matchesSearch(item) && matchesDietaryFilters(item)) {
          items.push(item);
        }
      });
    });
    return items;
  }, [menuData, matchesSearch, matchesDietaryFilters]);

  const totalItems = filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-12">
            <div className="h-10 w-64 bg-muted rounded animate-pulse mb-4" />
            <div className="h-6 w-96 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!menuData || menuData.categories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-12">
            <h1 className="font-serif text-4xl font-bold text-foreground">Our Menu</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Discover our carefully crafted dishes made with the finest ingredients.
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="font-serif text-4xl font-bold text-foreground">Our Menu</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            Discover our carefully crafted dishes made with the finest ingredients.
          </p>

          {/* Search and Filters */}
          <div className="mt-8">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Dietary Filters */}
            <DietaryFilters selectedFilters={dietaryFilters} onToggleFilter={toggleDietaryFilter} />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <CategoryTabs
        categories={filteredCategories.filter((c) => c.items.length > 0)}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        featuredCount={featuredItems.length}
      />

      {/* Menu Content */}
      <div id="menu-content" className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 scroll-mt-32">
        {totalItems === 0 ? (
          <div className="text-center py-16">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-serif text-lg font-bold text-foreground">No dishes found</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setDietaryFilters([]);
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Featured Section */}
            {featuredItems.length > 0 && (
              <FeaturedSection
                items={featuredItems}
                currency={currency}
                onQuickView={setQuickViewItem}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            )}

            {/* Category Sections */}
            {filteredCategories
              .filter((category) => category.items.length > 0)
              .map((category, categoryIndex) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  currency={currency}
                  onQuickView={setQuickViewItem}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  index={categoryIndex}
                />
              ))}
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        item={quickViewItem}
        isOpen={!!quickViewItem}
        onClose={() => setQuickViewItem(null)}
        currency={currency}
      />
    </div>
  );
}

// Category Section Component with Intersection Observer
function CategorySection({
  category,
  currency,
  onQuickView,
  favorites,
  onToggleFavorite,
  index,
}: {
  category: MenuCategory;
  currency: string;
  onQuickView: (item: MenuItem) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  index: number;
}) {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <section
      ref={ref}
      key={category.id}
      id={`category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
      className="scroll-mt-32"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isIntersecting ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="p-2 bg-primary rounded-xl shadow-md">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">{category.name}</h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">{category.items.length} items</span>
      </motion.div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {category.items.map((item, itemIndex) => (
          <DishCard
            key={item.id}
            item={item}
            currency={currency}
            onQuickView={onQuickView}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={onToggleFavorite}
            index={itemIndex}
          />
        ))}
      </div>
    </section>
  );
}
