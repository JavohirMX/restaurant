'use client';

import { useRequireAuth } from '@/lib/admin-auth';
import { useReservations } from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { CalendarDays, Users, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { isLoading: isAuthLoading } = useRequireAuth();
  const { data: reservationsData, isLoading: isReservationsLoading } = useReservations({ status: 'pending' });

  if (isAuthLoading) {
    return <Loading fullScreen />;
  }

  const pendingCount = reservationsData?.data?.length || 0;

  const stats = [
    {
      name: 'Pending Reservations',
      value: pendingCount.toString(),
      icon: Clock,
      href: '/admin/reservations?status=pending',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Today\'s Reservations',
      value: 'View',
      icon: CalendarDays,
      href: '/admin/reservations',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Menu Items',
      value: 'Manage',
      icon: CheckCircle,
      href: '/admin/menu',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Gallery Images',
      value: 'Manage',
      icon: Users,
      href: '/admin/gallery',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="rounded-lg bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center">
              <div className={`rounded-lg ${stat.bgColor} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-semibold text-foreground">
                  {isReservationsLoading && stat.name === 'Pending Reservations'
                    ? '...'
                    : stat.value}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionLink href="/admin/reservations" label="View Reservations" />
          <QuickActionLink href="/admin/menu" label="Manage Menu" />
          <QuickActionLink href="/admin/gallery" label="Update Gallery" />
          <QuickActionLink href="/admin/testimonials" label="Edit Testimonials" />
          <QuickActionLink href="/admin/blog" label="Manage Blog" />
          <QuickActionLink href="/admin/settings/hours" label="Update Hours" />
        </div>
      </div>

      {/* Recent Pending Reservations */}
      <div className="rounded-lg bg-card shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Pending Reservations
          </h2>
        </div>
        <div className="p-6">
          {isReservationsLoading ? (
            <Loading />
          ) : pendingCount === 0 ? (
            <p className="text-center text-muted-foreground">No pending reservations</p>
          ) : (
            <div className="space-y-4">
              {reservationsData?.data.slice(0, 5).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {reservation.guest_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(reservation.starts_at).toLocaleString()} ·{' '}
                      {reservation.party_size} guests
                    </p>
                  </div>
                  <Link
                    href={`/admin/reservations?id=${reservation.id}`}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted"
    >
      <span className="font-medium text-foreground">{label}</span>
    </Link>
  );
}
