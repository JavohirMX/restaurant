'use client';

import { useRequireAuth } from '@/lib/admin-auth';
import {
  useReservationSettings,
  useUpdateReservationSettings,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { Save, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { ReservationSettings } from '@/lib/admin-api';

export default function ReservationSettingsPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(false, false, true);
  const { data: settings, isLoading: isSettingsLoading } = useReservationSettings();
  const updateSettings = useUpdateReservationSettings();

  const form = useForm<ReservationSettings>({
    defaultValues: {
      slot_interval_minutes: 30,
      turn_time_minutes: 120,
      max_guests_per_slot: 20,
      max_party_size_online: 8,
      min_lead_time_minutes: 60,
      max_days_ahead: 30,
      require_phone: false,
      approval_party_size_threshold: 8,
      same_day_window_hours: 4,
      near_capacity_percent: 80,
      approval_windows: {},
      token_expiry_days: 7,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  if (isAuthLoading || isSettingsLoading) {
    return <Loading fullScreen />;
  }

  const handleSubmit = async (data: ReservationSettings) => {
    await updateSettings.mutateAsync(data);
  };

  const SettingField = ({
    label,
    description,
    name,
    type = 'number',
    min,
    max,
  }: {
    label: string;
    description?: string;
    name: keyof ReservationSettings;
    type?: 'number' | 'checkbox';
    min?: number;
    max?: number;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {type === 'checkbox' ? (
        <input
          type="checkbox"
          {...form.register(name)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
      ) : (
        <input
          type="number"
          {...form.register(name, { valueAsNumber: true })}
          min={min}
          max={max}
          className="block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Reservation Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure reservation policies and limits
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Time Settings */}
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Time Settings</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SettingField
              label="Slot Interval (minutes)"
              description="Time between available reservation slots"
              name="slot_interval_minutes"
              min={15}
              max={120}
            />
            <SettingField
              label="Turn Time (minutes)"
              description="Default duration of a reservation"
              name="turn_time_minutes"
              min={30}
              max={300}
            />
            <SettingField
              label="Minimum Lead Time (minutes)"
              description="How far in advance reservations must be made"
              name="min_lead_time_minutes"
              min={0}
            />
            <SettingField
              label="Max Days Ahead"
              description="How far in advance guests can book"
              name="max_days_ahead"
              min={1}
              max={365}
            />
          </div>
        </div>

        {/* Capacity Settings */}
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Capacity Settings
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SettingField
              label="Max Guests Per Slot"
              description="Maximum total guests per time slot"
              name="max_guests_per_slot"
              min={1}
            />
            <SettingField
              label="Max Party Size (Online)"
              description="Largest party that can book online"
              name="max_party_size_online"
              min={1}
            />
            <SettingField
              label="Near Capacity Threshold (%)"
              description="When to show 'limited availability' warning"
              name="near_capacity_percent"
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Approval Settings */}
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Approval Settings
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SettingField
              label="Approval Threshold (guests)"
              description="Parties larger than this require approval"
              name="approval_party_size_threshold"
              min={1}
            />
            <SettingField
              label="Same Day Window (hours)"
              description="Hours before closing that same-day bookings close"
              name="same_day_window_hours"
              min={0}
              max={24}
            />
          </div>
        </div>

        {/* Other Settings */}
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Other Settings
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SettingField
              label="Require Phone Number"
              description="Make phone number mandatory for reservations"
              name="require_phone"
              type="checkbox"
            />
            <SettingField
              label="Token Expiry (days)"
              description="How long guest access tokens remain valid"
              name="token_expiry_days"
              min={1}
              max={30}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {updateSettings.isSuccess && (
            <span className="text-sm text-green-600">Settings saved!</span>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="h-5 w-5 flex-shrink-0" />
          <p>
            Changes to these settings take effect immediately. Be careful when
            modifying capacity limits as they may affect existing reservations.
          </p>
        </div>
      </form>
    </div>
  );
}
