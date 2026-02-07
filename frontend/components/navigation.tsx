'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRestaurantInfo, RestaurantInfo } from '@/lib/api';
import { Menu, X, Phone, Calendar, ChefHat } from 'lucide-react';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      try {
        const info = await getRestaurantInfo();
        setRestaurantInfo(info);
      } catch (error) {
        console.error('Failed to fetch restaurant info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantInfo();
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') {
        return pathname === href;
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.startsWith('/#')) {
        e.preventDefault();
        const element = document.querySelector(href.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
      setMobileMenuOpen(false);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    },
    [mobileMenuOpen]
  );

  const phoneNumber = restaurantInfo?.phone || '+1 (555) 123-4567';
  const phoneHref = `tel:${phoneNumber.replace(/\D/g, '')}`;
  const restaurantName = restaurantInfo?.name || 'Restaurant';
  const logoUrl = restaurantInfo?.branding?.logo_url;

  return (
    <>
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-300 transition-theme',
          'border-b border-gray-200 dark:border-gray-800',
          scrolled
            ? 'bg-white/95 shadow-sm backdrop-blur-md dark:bg-slate-900/95'
            : 'bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:dark:bg-slate-900/60'
        )}
        role="banner"
      >
        <nav
          className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:h-[72px] md:px-8"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
            aria-label={`${restaurantName} - Go to homepage`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 animate-pulse rounded bg-gray-200 dark:bg-gray-700 md:h-8 md:w-8" />
                <div className="h-6 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ) : logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${restaurantName} Logo`}
                className="h-8 w-auto md:h-10"
                width={40}
                height={40}
              />
            ) : (
              <div className="flex items-center gap-2">
                <ChefHat className="h-7 w-7 text-amber-600 md:h-8 md:w-8" aria-hidden="true" />
                <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white md:text-xl">
                  {restaurantName}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  'group relative px-4 py-2 text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
                  isActive(item.href)
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
                <span
                  className={cn(
                    'absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-amber-600 transition-all duration-300',
                    isActive(item.href) && 'w-6'
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-amber-600 transition-all duration-300 group-hover:w-4',
                    isActive(item.href) && 'hidden'
                  )}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Phone Button */}
            <a
              href={phoneHref}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
                isLoading && 'pointer-events-none opacity-50'
              )}
              aria-label={`Call us at ${phoneNumber}`}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">{phoneNumber}</span>
            </a>

            {/* Theme Toggle */}
            <ThemeToggle variant="ghost" size="default" />

            {/* Book Table Button */}
            <Link
              href="/reservations"
              className={cn(
                'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all',
                'bg-amber-600 text-white hover:bg-amber-700',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
                'shadow-sm hover:shadow-md'
              )}
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Book a Table
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg transition-colors md:hidden',
              'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2'
            )}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!mobileMenuOpen}
        onKeyDown={handleKeyDown}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Menu Panel */}
        <div
          className={cn(
            'absolute right-0 top-0 h-full w-full overflow-y-auto',
            'bg-white shadow-xl dark:bg-slate-900'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          {/* Mobile Header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
                'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2'
              )}
              aria-label="Close menu"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="px-4 py-6" aria-label="Mobile navigation">
            <ul className="space-y-2" role="menubar">
              {navItems.map((item) => (
                <li key={item.href} role="none">
                  <Link
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={cn(
                      'flex min-h-[44px] items-center rounded-lg px-4 py-3 text-lg font-medium transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
                      isActive(item.href)
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    )}
                    role="menuitem"
                    tabIndex={mobileMenuOpen ? 0 : -1}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Actions */}
          <div className="border-t border-gray-200 px-4 py-6 dark:border-gray-800">
            <div className="space-y-4">
              {/* Book Table Button */}
              <Link
                href="/reservations"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
                  'bg-amber-600 text-base font-semibold text-white transition-all',
                  'hover:bg-amber-700',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2'
                )}
              >
                <Calendar className="h-5 w-5" aria-hidden="true" />
                Book a Table
              </Link>

              {/* Phone Button */}
              <a
                href={phoneHref}
                className={cn(
                  'flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
                  'border-2 border-amber-600 text-base font-semibold text-amber-600 transition-all',
                  'hover:bg-amber-50 dark:hover:bg-amber-900/30',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
                  isLoading && 'pointer-events-none opacity-50'
                )}
                aria-label={`Call us at ${phoneNumber}`}
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                {phoneNumber}
              </a>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                  Theme
                </span>
                <ThemeToggle variant="outline" size="default" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16 md:h-[72px]" aria-hidden="true" />
    </>
  );
}
