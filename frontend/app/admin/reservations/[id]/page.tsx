'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useReservation,
  useApproveReservation,
  useCancelReservation,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { ArrowLeft, CheckCircle, XCircle, Calendar, Users, Mail, Phone, Clock } from 'lucide-react';

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0;
}

export default function ReservationDetailPage() {
  const params = useParams();
  const rawId = params.id;
  const isIdValid = isValidId(rawId);
  const id = isIdValid ? rawId : '';

  const { isLoading: isAuthLoading } = useRequireAuth(false, true);
  const { data: reservation, isLoading: isReservationLoading } = useReservation(id);
  const approveReservation = useApproveReservation();
  const cancelReservation = useCancelReservation();

  if (!isIdValid) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Invalid reservation ID</p>
        <Link
          href="/admin/reservations"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to Reservations
        </Link>
      </div>
    );
  }

  if (isAuthLoading || isReservationLoading) {
    return <Loading fullScreen />;
  }

  if (!reservation) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Reservation not found</p>
        <Link
          href="/admin/reservations"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to Reservations
        </Link>
      </div>
    );
  }

  const handleApprove = async () => {
    if (confirm('Approve this reservation?')) {
      await approveReservation.mutateAsync(id);
    }
  };

  const handleCancel = async () => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/reservations"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Reservation Details
            </h1>
            <p className="text-sm text-muted-foreground">
              ID: {reservation.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {reservation.status === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={approveReservation.isPending}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {approveReservation.isPending ? 'Approving...' : 'Approve'}
            </button>
          )}
          {(reservation.status === 'pending' ||
            reservation.status === 'confirmed') && (
            <button
              onClick={handleCancel}
              disabled={cancelReservation.isPending}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              {cancelReservation.isPending ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main Info */}
        <div className="space-y-6">
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Reservation Info
            </h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium text-foreground">
                    {new Date(reservation.starts_at).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(reservation.starts_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {reservation.ends_at && (
                      <> - {new Date(reservation.ends_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Party Size</p>
                  <p className="font-medium text-foreground">
                    {reservation.party_size} guests
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(
                      reservation.status
                    )}`}
                  >
                    {reservation.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {reservation.notes && (
            <div className="rounded-lg bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                Special Requests
              </h2>
              <p className="mt-2 text-muted-foreground">{reservation.notes}</p>
            </div>
          )}
        </div>

        {/* Guest Info */}
        <div className="space-y-6">
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Guest Information
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">
                  {reservation.guest_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${reservation.guest_email}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {reservation.guest_email}
                  </a>
                </div>
              </div>
              {reservation.guest_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${reservation.guest_phone}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {reservation.guest_phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Token Info */}
          {reservation.token && (
            <div className="rounded-lg bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                Guest Access Token
              </h2>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Valid until:{' '}
                  {new Date(reservation.token.expires_at).toLocaleString()}
                </p>
                <p className="text-sm">
                  Status:{' '}
                  <span
                    className={
                      reservation.token.is_valid
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {reservation.token.is_valid ? 'Valid' : 'Expired'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="rounded-lg bg-muted p-6">
            <h2 className="text-sm font-semibold text-foreground">History</h2>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                Created: {new Date(reservation.created_at).toLocaleString()}
              </p>
              <p>
                Last updated: {new Date(reservation.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
