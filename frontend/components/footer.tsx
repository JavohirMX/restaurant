import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, Instagram, Facebook } from 'lucide-react';
import { getRestaurantInfo, getHours } from '@/lib/api';

export async function Footer() {
  let restaurant;
  let hours;
  
  try {
    restaurant = await getRestaurantInfo();
    hours = await getHours();
  } catch {
    // Fallback if API is not available
    restaurant = null;
    hours = null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted transition-theme">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Restaurant Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {restaurant?.name || 'Restaurant'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {restaurant?.tagline || 'Fine dining experience'}
            </p>
            {restaurant?.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {restaurant.description}
              </p>
            )}
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">Contact</h3>
            <ul className="mt-4 space-y-3">
              {restaurant?.phone && (
                <li>
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center min-h-[44px] text-base font-medium text-foreground hover:text-amber-600 transition-colors sm:text-sm sm:font-normal sm:text-muted-foreground sm:hover:text-foreground"
                  >
                    <Phone className="mr-2 h-5 w-5 flex-shrink-0" />
                    {restaurant.phone}
                  </a>
                </li>
              )}
              {restaurant?.email && (
                <li>
                  <a
                    href={`mailto:${restaurant.email}`}
                    className="flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                    {restaurant.email}
                  </a>
                </li>
              )}
              {restaurant?.location && (
                <li>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      `${restaurant.location.address_line1}, ${restaurant.location.city}, ${restaurant.location.region} ${restaurant.location.postal_code}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start min-h-[44px] text-sm text-muted-foreground hover:text-foreground"
                  >
                    <MapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      {restaurant.location.address_line1}
                      {restaurant.location.address_line2 && (
                        <>, {restaurant.location.address_line2}</>
                      )}
                      <br />
                      {restaurant.location.city}, {restaurant.location.region}{' '}
                      {restaurant.location.postal_code}
                    </span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">Hours</h3>
            <ul className="mt-4 space-y-2">
              {hours?.service_periods ? (
                hours.service_periods.map((period) => (
                  <li key={period.id} className="flex items-start text-sm">
                    <Clock className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-foreground">{period.weekday_display}:</span>
                      <div className="text-muted-foreground">
                        {period.opens_at} - {period.closes_at}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">Hours not available</li>
              )}
            </ul>
          </div>

          {/* Quick Links & Social */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
            <ul className="mt-4 space-y-1 sm:space-y-2">
              <li>
                <Link href="/menu" className="inline-flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
                  View Menu
                </Link>
              </li>
              <li>
                <Link href="/reservations" className="inline-flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
                  Book a Table
                </Link>
              </li>
              <li>
                <Link href="/about" className="inline-flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
              </li>
            </ul>

            {/* Social Links */}
            {restaurant?.social && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground">Follow Us</h4>
                <div className="mt-3 flex space-x-4">
                  {restaurant.social.instagram && (
                    <a
                      href={restaurant.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-6 w-6" />
                    </a>
                  )}
                  {restaurant.social.facebook && (
                    <a
                      href={restaurant.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-6 w-6" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 sm:mt-12 border-t pt-6 sm:pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              &copy; {currentYear} {restaurant?.name || 'Restaurant'}. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/privacy" className="inline-flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="inline-flex items-center min-h-[44px] text-sm text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
