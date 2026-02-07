'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Users, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Search } from "lucide-react";
import { getAvailability, createReservation, getRestaurantInfo, getErrorMessage, getValidationErrors } from "@/lib/api";
import { queryKeys } from "@/lib/query-client";
import { Loading } from "@/components/loading";
import { Button } from "@/components/ui/button";
import { getTodayString, addDays, formatDate, getDayName } from "@/lib/utils";
import { ReservationFormData, ReservationStep } from "@/types";

const partySizeOptions = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ReservationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'new' | 'lookup'>('new');
  const [lookupToken, setLookupToken] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [step, setStep] = useState<ReservationStep>('date');
  const [formData, setFormData] = useState<ReservationFormData>({
    partySize: 2,
    date: getTodayString(),
    time: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [reservationToken, setReservationToken] = useState<string | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    
    if (!lookupToken.trim()) {
      setLookupError('Please enter your reservation token');
      return;
    }
    
    // Navigate to the reservation management page
    router.push(`/reservations/${lookupToken.trim()}`);
  };

  const { data: restaurant } = useQuery({
    queryKey: queryKeys.restaurant,
    queryFn: getRestaurantInfo,
  });

  const { data: availability, isLoading: isLoadingAvailability } = useQuery({
    queryKey: queryKeys.availability(formData.date),
    queryFn: () => getAvailability(formData.date),
    enabled: !!formData.date,
  });

  const createReservationMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (data) => {
      setReservationToken(data.token.token);
      setStep('confirmation');
    },
    onError: (error) => {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
    },
  });

  const availableSlots = availability?.slots?.filter(slot => slot.available) || [];

  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, date, time: '' }));
    setErrors({});
  };

  const handlePartySizeChange = (partySize: number) => {
    setFormData(prev => ({ ...prev, partySize }));
    setErrors({});
  };

  const handleTimeSelect = (time: string) => {
    setFormData(prev => ({ ...prev, time }));
    setErrors({});
    setStep('details');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: Record<string, string[]> = {};
    if (!formData.name.trim()) newErrors.name = ['Name is required'];
    if (!formData.email.trim()) newErrors.email = ['Email is required'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = ['Please enter a valid email address'];
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create reservation
    createReservationMutation.mutate({
      party_size: formData.partySize,
      starts_at: `${formData.date}T${formData.time}`,
      guest: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      },
      notes: formData.notes,
      website: '', // honeypot field
    });
  };

  const canGoBack = step !== 'date' && step !== 'confirmation';

  const handleBack = () => {
    if (step === 'time') setStep('date');
    if (step === 'details') setStep('time');
  };

  // Generate date options (next 30 days)
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(getTodayString(), i);
    return {
      value: date,
      label: formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' }),
      dayName: getDayName(date),
    };
  });

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {canGoBack && (
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Book a Table
              </h1>
              <p className="mt-2 text-muted-foreground">
                {step === 'date' && 'Select your party size and preferred date'}
                {step === 'time' && 'Choose an available time slot'}
                {step === 'details' && 'Complete your reservation details'}
                {step === 'confirmation' && 'Your reservation is confirmed!'}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              {['date', 'time', 'details', 'confirmation'].map((s, index) => {
                const isActive = step === s;
                const isCompleted = 
                  (step === 'time' && s === 'date') ||
                  (step === 'details' && ['date', 'time'].includes(s)) ||
                  (step === 'confirmation');
                
                return (
                  <div key={s} className="flex items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < 3 && (
                      <div
                        className={`hidden sm:block w-16 lg:w-24 h-0.5 mx-2 ${
                          isCompleted ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Tabs */}
          <div className="mb-8 border border-border rounded-lg overflow-hidden">
            <div className="flex">
              <button
                onClick={() => setActiveTab('new')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'new'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                New Reservation
              </button>
              <button
                onClick={() => setActiveTab('lookup')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'lookup'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                Find My Reservation
              </button>
            </div>
          </div>

          {/* New Reservation Content */}
          {activeTab === 'new' && (
            <>
              {/* Step 1: Date & Party Size */}
              {step === 'date' && (
            <div className="space-y-8">
              {/* Party Size */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  <Users className="inline h-4 w-4 mr-2" />
                  Party Size
                </label>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                  {partySizeOptions.map((size) => (
                    <button
                      key={size}
                      onClick={() => handlePartySizeChange(size)}
                      className={`min-h-[48px] min-w-[44px] rounded-lg border px-3 py-3 text-center font-medium transition-colors touch-manipulation ${
                        formData.partySize === size
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-card text-foreground hover:border-border'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {formData.partySize > 8 && (
                  <p className="mt-2 text-sm text-amber-600">
                    For parties larger than 8, please call us directly.
                  </p>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  <Calendar className="inline h-4 w-4 mr-2" />
                  Select Date
                </label>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                  {dateOptions.map((date) => (
                    <button
                      key={date.value}
                      onClick={() => handleDateChange(date.value)}
                      className={`min-h-[60px] min-w-[44px] rounded-lg border px-2 py-2 text-center transition-colors touch-manipulation ${
                        formData.date === date.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-card text-foreground hover:border-border'
                      }`}
                    >
                      <div className="text-xs uppercase leading-tight">{date.label.split(' ')[0]}</div>
                      <div className="text-base font-semibold leading-tight">{date.label.split(' ')[2]}</div>
                      <div className="text-xs leading-tight">{date.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep('time')}
                className="w-full gap-2 min-h-[48px]"
                size="lg"
              >
                Check Availability
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Time Selection */}
          {step === 'time' && (
            <div>
              <div className="mb-6 rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Selected</p>
                    <p className="font-medium text-foreground">
                      {formData.partySize} people • {formatDate(formData.date)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep('date')}>
                    Change
                  </Button>
                </div>
              </div>

              {isLoadingAvailability ? (
                <Loading message="Checking availability..." />
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">No availability</h3>
                  <p className="mt-2 text-muted-foreground">
                    Sorry, there are no available tables for this date. Please try another date.
                  </p>
                  <Button onClick={() => setStep('date')} className="mt-6 min-h-[44px]">
                    Choose Another Date
                  </Button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    <Clock className="inline h-4 w-4 mr-2" />
                    Available Times
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    {availableSlots.map((slot) => {
                      const time = slot.starts_at.split('T')[1].slice(0, 5);
                      return (
                        <button
                          key={slot.starts_at}
                          onClick={() => handleTimeSelect(time)}
                          className={`min-h-[52px] min-w-[44px] rounded-lg border px-3 py-3 text-center font-medium transition-colors touch-manipulation ${
                            slot.requires_approval
                              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400'
                              : 'border-input bg-card text-foreground hover:border-border'
                          }`}
                        >
                          <span className="text-base">{time}</span>
                          {slot.requires_approval && (
                            <div className="mt-1 text-xs">Approval needed</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Guest Details */}
          {step === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mb-6 rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reservation</p>
                    <p className="font-medium text-foreground">
                      {formData.partySize} people • {formatDate(formData.date)} at {formData.time}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep('time')}>
                    Change
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`block w-full min-h-[48px] rounded-md border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-1 ${
                      errors.name
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-input focus:border-ring focus:ring-ring'
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block w-full min-h-[48px] rounded-md border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-1 ${
                      errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-input focus:border-ring focus:ring-ring'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full min-h-[48px] rounded-md border border-input px-3 py-3 text-base shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
                  Special Requests
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border border-input px-3 py-3 text-base shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Any dietary restrictions, special occasions, or seating preferences?"
                />
              </div>

              {/* Honeypot field - hidden from users */}
              <div className="hidden">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {createReservationMutation.error && (
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-600">
                    {getErrorMessage(createReservationMutation.error)}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={createReservationMutation.isPending}
                className="w-full min-h-[52px]"
                size="lg"
              >
                {createReservationMutation.isPending ? 'Confirming...' : 'Confirm Reservation'}
              </Button>
            </form>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirmation' && reservationToken && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-foreground">
                Reservation Confirmed!
              </h2>
              <p className="mt-2 text-muted-foreground">
                We've sent a confirmation email to {formData.email}
              </p>

              <div className="mt-8 rounded-lg bg-muted p-6 text-left">
                <h3 className="font-semibold text-foreground">Reservation Details</h3>
                <dl className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date:</dt>
                    <dd className="font-medium">{formatDate(formData.date)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Time:</dt>
                    <dd className="font-medium">{formData.time}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Party Size:</dt>
                    <dd className="font-medium">{formData.partySize} people</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd className="font-medium">{formData.name}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Save your reservation token:</strong>
                  <br />
                  <code className="mt-1 block break-all rounded bg-amber-100 px-2 py-1 font-mono text-amber-900">
                    {reservationToken}
                  </code>
                  <span className="mt-2 block">
                    You'll need this to modify or cancel your reservation.
                  </span>
                </p>
              </div>

              <div className="mt-6">
                <Button 
                  onClick={() => router.push(`/reservations/${reservationToken}`)}
                  variant="outline"
                  className="w-full"
                >
                  Manage Reservation
                </Button>
              </div>

              <div className="mt-4 flex justify-center gap-4">
                <Button onClick={() => router.push('/')} variant="outline">
                  Return Home
                </Button>
                <Button onClick={() => router.push('/menu')}>
                  View Menu
                </Button>
              </div>
            </div>
          )}
            </>
          )}

          {/* Find My Reservation Content */}
          {activeTab === 'lookup' && (
            <div className="rounded-lg bg-card p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Find Your Reservation</h2>
                <p className="mt-2 text-muted-foreground">
                  Enter your reservation token to view, modify, or cancel your booking.
                </p>
              </div>

              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-foreground mb-2">
                    Reservation Token
                  </label>
                  <input
                    type="text"
                    id="token"
                    value={lookupToken}
                    onChange={(e) => setLookupToken(e.target.value)}
                    placeholder="Paste your token here (e.g., xxxxxxxxxxxxxxxx)"
                    className="block w-full min-h-[48px] rounded-lg border border-input px-4 py-3 text-base text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {lookupError && (
                    <p className="mt-2 text-sm text-red-600">{lookupError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[48px]"
                  size="lg"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Find Reservation
                </Button>
              </form>

              <div className="mt-8 border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground mb-2">Where is my token?</h3>
                <p className="text-sm text-muted-foreground">
                  Your reservation token was provided in your confirmation email and shown on the confirmation page after booking. 
                  It's a unique code that allows you to manage your reservation.
                </p>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setActiveTab('new')}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Need to make a new reservation instead?
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
