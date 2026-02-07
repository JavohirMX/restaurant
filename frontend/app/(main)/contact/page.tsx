'use client';

import { useState, Suspense } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, Instagram, Facebook, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getRestaurantInfo, getHours } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { Button } from "@/components/ui/button";
import { ContactFormData } from "@/types";

// Skeleton component for restaurant info loading
function ContactInfoSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-48"></div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="h-12 w-12 bg-muted rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Map loading component
function MapSkeleton() {
  return (
    <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
  );
}

// Contact information card component
function ContactInfoCard({ 
  icon: Icon, 
  title, 
  children, 
  href,
  isLarge = false 
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode; 
  href?: string;
  isLarge?: boolean;
}) {
  const content = (
    <div className={`flex items-start gap-4 p-4 rounded-lg bg-card border border-border shadow-sm hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 flex-shrink-0">
        <Icon className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium text-foreground ${isLarge ? 'text-sm' : 'text-sm'}`}>{title}</h3>
        <div className={`mt-1 text-muted-foreground ${isLarge ? 'text-2xl font-bold text-foreground' : 'text-base'} break-words`}>
          {children}
        </div>
      </div>
      {href && <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

// Social media link component
function SocialLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border shadow-sm hover:shadow-md hover:border-amber-200 transition-all group"
      aria-label={label}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 group-hover:from-amber-200 group-hover:to-amber-100 transition-colors">
        <Icon className="h-5 w-5 text-amber-600" />
      </div>
      <span className="font-medium text-foreground group-hover:text-foreground">{label}</span>
    </a>
  );
}

// Contact form component with validation
function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'phone':
        if (value && !/^[\d\s\-\(\)\+\.]+$/.test(value)) return 'Please enter a valid phone number';
        return '';
      case 'subject':
        if (!value) return 'Please select a subject';
        return '';
      case 'message':
        if (!value.trim()) return 'Message is required';
        if (value.trim().length < 10) return 'Message must be at least 10 characters';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof ContactFormData>).forEach((key) => {
      const value = formData[key];
      const error = value !== undefined ? validateField(key, value) : '';
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission - in a real app, this would send to an API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Message Sent Successfully!</h3>
        <p className="mt-2 text-muted-foreground">
          Thank you for reaching out. We'll get back to you as soon as possible.
        </p>
        <Button
          onClick={() => {
            setIsSubmitted(false);
            setFormData({
              name: '',
              email: '',
              phone: '',
              subject: '',
              message: '',
            });
            setErrors({});
            setTouched({});
          }}
          className="mt-6 bg-amber-600 hover:bg-amber-700"
          variant="default"
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Full Name <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-lg border px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors min-h-[48px] ${
              errors.name && touched.name ? 'border-red-300 bg-red-50' : 'border-input'
            }`}
            placeholder="Your full name"
            aria-invalid={errors.name && touched.name ? 'true' : 'false'}
            aria-describedby={errors.name && touched.name ? 'name-error' : undefined}
          />
          {errors.name && touched.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email Address <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-lg border px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors min-h-[48px] ${
              errors.email && touched.email ? 'border-red-300 bg-red-50' : 'border-input'
            }`}
            placeholder="you@example.com"
            aria-invalid={errors.email && touched.email ? 'true' : 'false'}
            aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
          />
          {errors.email && touched.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-lg border px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors min-h-[48px] ${
              errors.phone && touched.phone ? 'border-red-300 bg-red-50' : 'border-input'
            }`}
            placeholder="(555) 123-4567"
            aria-invalid={errors.phone && touched.phone ? 'true' : 'false'}
            aria-describedby={errors.phone && touched.phone ? 'phone-error' : undefined}
          />
          {errors.phone && touched.phone && (
            <p id="phone-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.phone}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-foreground">
            Subject <span className="text-red-500" aria-label="required">*</span>
          </label>
          <select
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-lg border px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors min-h-[48px] ${
              errors.subject && touched.subject ? 'border-red-300 bg-red-50' : 'border-input'
            }`}
            aria-invalid={errors.subject && touched.subject ? 'true' : 'false'}
            aria-describedby={errors.subject && touched.subject ? 'subject-error' : undefined}
          >
            <option value="">Select a subject</option>
            <option value="general">General Inquiry</option>
            <option value="reservation">Reservation Question</option>
            <option value="feedback">Feedback</option>
            <option value="catering">Catering</option>
            <option value="private-event">Private Event</option>
            <option value="other">Other</option>
          </select>
          {errors.subject && touched.subject && (
            <p id="subject-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.subject}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground">
          Message <span className="text-red-500" aria-label="required">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          value={formData.message}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`mt-1 block w-full rounded-lg border px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
            errors.message && touched.message ? 'border-red-300 bg-red-50' : 'border-input'
          }`}
          placeholder="Tell us how we can help you..."
          aria-invalid={errors.message && touched.message ? 'true' : 'false'}
          aria-describedby={errors.message && touched.message ? 'message-error' : undefined}
        />
        {errors.message && touched.message && (
          <p id="message-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.message}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Minimum 10 characters required
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 min-h-[56px] text-lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Sending Message...
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Send Message
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        <span className="text-red-500">*</span> Required fields
      </p>
    </form>
  );
}

// Map component with fallback
function MapEmbed({ embedUrl, address }: { embedUrl: string; address: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  if (hasError) {
    return (
      <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] bg-muted rounded-lg flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Unable to load map</p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors touch-manipulation"
        >
          <ExternalLink className="h-4 w-4" />
          Get Directions
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] rounded-lg overflow-hidden bg-muted">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      )}
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Restaurant Location"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}

// Main content component
function ContactPageContent() {
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: queryKeys.restaurant,
    queryFn: getRestaurantInfo,
  });

  const { data: hoursData, isLoading: isLoadingHours } = useQuery({
    queryKey: queryKeys.hours,
    queryFn: getHours,
  });

  // Transform service_periods into schedule format
  const schedule = hoursData?.service_periods ? 
    hoursData.service_periods.reduce((acc, period) => {
      const dayName = period.weekday_display;
      if (!acc[dayName]) {
        acc[dayName] = [];
      }
      acc[dayName].push({
        opens_at: period.opens_at,
        closes_at: period.closes_at,
      });
      return acc;
    }, {} as Record<string, { opens_at: string; closes_at: string }[]>) : 
    {};

  const addressString = restaurant?.location ? 
    `${restaurant.location.address_line1}, ${restaurant.location.city}, ${restaurant.location.region} ${restaurant.location.postal_code}` : 
    '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-secondary to-background">
      {/* Hero Header */}
      <div className="relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-gray-900"></div>
        <div className="relative container mx-auto px-4 py-16 sm:py-20 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            Get in <span className="text-amber-400">Touch</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            We'd love to hear from you. Whether you have a question about our menu, 
            want to make a special request, or just want to say hello.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
          {/* Left Column - Contact Information */}
          <div className="space-y-8">
            {isLoadingRestaurant || isLoadingHours ? (
              <ContactInfoSkeleton />
            ) : (
              <>
                {/* Contact Info Cards */}
                <div className="space-y-4">
                  {restaurant?.phone && (
                    <ContactInfoCard
                      icon={Phone}
                      title="Call Us"
                      href={`tel:${restaurant.phone}`}
                      isLarge
                    >
                      {restaurant.phone}
                    </ContactInfoCard>
                  )}

                  {restaurant?.email && (
                    <ContactInfoCard
                      icon={Mail}
                      title="Email Us"
                      href={`mailto:${restaurant.email}`}
                    >
                      {restaurant.email}
                    </ContactInfoCard>
                  )}

                  {restaurant?.location && (
                    <ContactInfoCard
                      icon={MapPin}
                      title="Visit Us"
                    >
                      {restaurant.location.address_line1}
                      {restaurant.location.address_line2 && (
                        <>, {restaurant.location.address_line2}</>
                      )}
                      <br />
                      {restaurant.location.city}, {restaurant.location.region}{" "}
                      {restaurant.location.postal_code}
                    </ContactInfoCard>
                  )}

                  {Object.keys(schedule).length > 0 && (
                    <ContactInfoCard
                      icon={Clock}
                      title="Business Hours"
                    >
                      <div className="space-y-1">
                        {Object.entries(schedule)
                          .filter(([_, periods]) => periods.length > 0)
                          .map(([day, periods]) => (
                            <div key={day} className="flex justify-between gap-4 text-sm">
                              <span className="font-medium">{day}:</span>
                              <span>{periods.map(p => `${p.opens_at}-${p.closes_at}`).join(", ")}</span>
                            </div>
                          ))}
                      </div>
                    </ContactInfoCard>
                  )}
                </div>

                {/* Social Media Links */}
                <div className="pt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Follow Us</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SocialLink
                      href={restaurant?.social?.instagram || '#'}
                      icon={Instagram}
                      label="Instagram"
                    />
                    <SocialLink
                      href={restaurant?.social?.facebook || '#'}
                      icon={Facebook}
                      label="Facebook"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Map and Form */}
          <div className="space-y-8">
            {/* Map Section */}
            {restaurant?.location?.google_maps_embed_url && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Find Us</h2>
                <Suspense fallback={<MapSkeleton />}>
                  <MapEmbed 
                    embedUrl={restaurant.location.google_maps_embed_url}
                    address={addressString}
                  />
                </Suspense>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressString)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium touch-manipulation"
                >
                  <ExternalLink className="h-4 w-4" />
                  Get Directions
                </a>
              </div>
            )}

            {/* Contact Form Card */}
            <div className="rounded-xl bg-card p-6 sm:p-8 shadow-lg border border-border">
              <h2 className="text-xl font-bold text-foreground mb-6">Send us a Message</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with error boundary
export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
      </div>
    }>
      <ContactPageContent />
    </Suspense>
  );
}
