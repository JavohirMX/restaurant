'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useReservations,
  useApproveReservation,
  useCancelReservation,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { CheckCircle, XCircle, Search, Filter, Calendar } from 'lucide-react';

interface Filters {
  status: string;
  from: string;
  to: string;
  q: string;
}

export default function ReservationsPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(false, true);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    from: '',
    to: '',
    q: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: reservationsData, isLoading: isReservationsLoading } = useReservations(
    filters.status || filters.from || filters.to || filters.q
      ? {
          status: filters.status || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          q: filters.q || undefined,
        }
      : undefined
  );
  const approveReservation = useApproveReservation();
  const cancelReservation = useCancelReservation();

  if (isAuthLoading) {
    return <Loading fullScreen />;
  }

  const reservations = reservationsData?.data || [];

  const handleApprove = async (id: string) => {
    if (confirm('Approve this reservation?')) {
      await approveReservation.mutateAsync(id);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Enter cancellation reason (optional):');
    if (confirm('Cancel this reservation?')) {
      await cancelReservation.mutateAsync({ id, reason: reason || undefined });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', from: '', to: '', q: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and approve reservations
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                From Date
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                To Date
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Search
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder="Name, email, phone"
                  className="block w-full rounded-lg border border-input py-2 pl-10 pr-3 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={clearFilters}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
        Live updates enabled (refreshes every 5 seconds)
      </div>

      {/* Reservations List */}
      <div className="rounded-lg bg-card shadow-sm">
        {isReservationsLoading ? (
          <Loading />
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No reservations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Party Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-muted">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {reservation.guest_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reservation.guest_email}
                        </p>
                        {reservation.guest_phone && (
                          <p className="text-sm text-muted-foreground">
                            {reservation.guest_phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground">
                        {new Date(reservation.starts_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reservation.starts_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">
                        {reservation.party_size} guests
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(
                          reservation.status
                        )}`}
                      >
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/reservations/${reservation.id}`}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          View
                        </Link>
                        {reservation.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(reservation.id)}
                            disabled={approveReservation.isPending}
                            className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </button>
                        )}
                        {(reservation.status === 'pending' ||
                          reservation.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(reservation.id)}
                            disabled={cancelReservation.isPending}
                            className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
