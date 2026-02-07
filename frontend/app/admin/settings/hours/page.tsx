'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useHours,
  useCreateHour,
  useUpdateHour,
  useDeleteHour,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ServicePeriod } from '@/lib/admin-api';

interface HourFormData {
  name: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
}

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function HoursPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(false, false, true);
  const { data: hoursData, isLoading: isHoursLoading } = useHours();
  const createHour = useCreateHour();
  const updateHour = useUpdateHour();
  const deleteHour = useDeleteHour();

  const [editingHour, setEditingHour] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<HourFormData>({
    defaultValues: {
      name: '',
      weekday: 0,
      opens_at: '09:00',
      closes_at: '17:00',
    },
  });

  if (isAuthLoading || isHoursLoading) {
    return <Loading fullScreen />;
  }

  const hours = hoursData?.service_periods || [];

  // Group hours by weekday
  const hoursByDay = WEEKDAYS.map((day, index) => ({
    day,
    index,
    periods: hours.filter((h) => h.weekday === index),
  }));

  const handleCreate = async (data: HourFormData) => {
    await createHour.mutateAsync(data);
    setShowForm(false);
    form.reset();
  };

  const handleUpdate = async (id: string, data: HourFormData) => {
    await updateHour.mutateAsync({ id, data });
    setEditingHour(null);
    form.reset();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this time period?')) {
      await deleteHour.mutateAsync(id);
    }
  };

  const startEdit = (hour: ServicePeriod) => {
    setEditingHour(hour.id);
    form.setValue('name', hour.name);
    form.setValue('weekday', hour.weekday);
    form.setValue('opens_at', hour.opens_at);
    form.setValue('closes_at', hour.closes_at);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opening Hours</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage restaurant service periods
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Period
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">
            New Service Period
          </h3>
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <div>
              <label className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                {...form.register('name')}
                placeholder="e.g., Lunch, Dinner"
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Day of Week
              </label>
              <select
                {...form.register('weekday', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {WEEKDAYS.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Opens At
              </label>
              <input
                type="time"
                {...form.register('opens_at')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Closes At
              </label>
              <input
                type="time"
                {...form.register('closes_at')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={createHour.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createHour.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  form.reset();
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hours by Day */}
      <div className="space-y-4">
        {hoursByDay.map(({ day, periods }) => (
          <div key={day} className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">{day}</h3>
            {periods.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Closed</p>
            ) : (
              <div className="mt-4 space-y-3">
                {periods.map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between rounded-lg bg-muted p-3"
                  >
                    {editingHour === period.id ? (
                      <form
                        onSubmit={form.handleSubmit((data) =>
                          handleUpdate(period.id, data)
                        )}
                        className="flex w-full flex-wrap items-center gap-2"
                      >
                        <input
                          {...form.register('name')}
                          className="rounded border border-input px-2 py-1"
                        />
                        <input
                          type="time"
                          {...form.register('opens_at')}
                          className="rounded border border-input px-2 py-1"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          {...form.register('closes_at')}
                          className="rounded border border-input px-2 py-1"
                        />
                        <div className="ml-auto flex gap-2">
                          <button
                            type="submit"
                            disabled={updateHour.isPending}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingHour(null);
                              form.reset();
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {period.name}
                          </span>
                          <span className="text-muted-foreground">
                            {period.opens_at} - {period.closes_at}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(period)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(period.id)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
