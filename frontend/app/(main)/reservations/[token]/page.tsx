'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Calendar, Users, Clock, CheckCircle, AlertCircle, ArrowLeft, Edit2, XCircle } from 'lucide-react';
import { getReservationByToken, modifyReservation, cancelReservation, getErrorMessage, getValidationErrors } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';

interface ManageReservationPageProps {
  params: {
    token: string;
  };
}

function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0;
}

export default function ManageReservationPage({ params }: ManageReservationPageProps) {
  const router = useRouter();
  const { token } = params;
  const isTokenValid = isValidToken(token);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    party_size: 2,
    guest_name: '',
    guest_phone: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { data: reservationData, isLoading, error } = useQuery({
    queryKey: queryKeys.reservation(isTokenValid ? token : 'invalid'),
    queryFn: () => getReservationByToken(token),
    retry: false,
    enabled: isTokenValid,
  });

  const modifyMutation = useMutation({
    mutationFn: (data: Parameters<typeof modifyReservation>[1]) => modifyReservation(token, data),
    onSuccess: () => {
      setIsEditing(false);
      setErrors({});
    },
    onError: (error) => {
      const validationErrors = getValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => cancelReservation(token, reason),
    onSuccess: () => {
      router.push('/reservations');
    },
  });

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Invalid Reservation</h1>
          <p className="mt-2 text-muted-foreground">The reservation token is invalid.</p>
          <Button
            onClick={() => router.push('/reservations')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Make a New Reservation
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <Loading message="Loading reservation..." />
      </div>
    );
  }

  if (error || !reservationData) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Reservation Not Found</h1>
          <p className="mt-2 text-muted-foreground">This reservation may have expired or been cancelled.</p>
          <Button
            onClick={() => router.push('/reservations')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Make a New Reservation
          </Button>
        </div>
      </div>
    );
  }

  const { reservation, token: tokenInfo } = reservationData;
  const isCancelled = reservation.status === 'cancelled';
  const isExpired = !tokenInfo.is_valid;

  const handleEdit = () => {
    setEditForm({
      party_size: reservation.party_size,
      guest_name: reservation.guest_name,
      guest_phone: reservation.guest_phone || '',
      notes: reservation.notes || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const updateData: Parameters<typeof modifyReservation>[1] = {};
    
    if (editForm.party_size !== reservation.party_size) {
      updateData.party_size = editForm.party_size;
    }
    if (editForm.notes !== (reservation.notes || '')) {
      updateData.notes = editForm.notes;
    }
    if (editForm.guest_name !== reservation.guest_name || editForm.guest_phone !== (reservation.guest_phone || '')) {
      updateData.guest = {
        name: editForm.guest_name,
        email: reservation.guest_email,
        phone: editForm.guest_phone,
      };
    }

    if (Object.keys(updateData).length > 0) {
      modifyMutation.mutate(updateData);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    const reason = prompt('Please provide a reason for cancellation (optional):');
    if (confirm('Are you sure you want to cancel this reservation?')) {
      cancelMutation.mutate(reason || undefined);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={() => router.push('/reservations')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reservations
          </Button>

          <div className="rounded-lg bg-card shadow-sm">
            {/* Header */}
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Reservation Details</h1>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusBadge(
                    reservation.status
                  )}`}
                >
                  {reservation.status}
                </span>
              </div>
              
              {isExpired && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  This reservation link has expired. Please contact the restaurant for assistance.
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {new Date(reservation.starts_at).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(reservation.starts_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Party Size */}
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                {isEditing ? (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Party Size
                    </label>
                    <select
                      value={editForm.party_size}
                      onChange={(e) => setEditForm({ ...editForm, party_size: parseInt(e.target.value) })}
                      className="block w-full rounded-md border border-input px-3 py-2"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'person' : 'people'}
                        </option>
                      ))}
                    </select>
                    {errors.party_size && (
                      <p className="mt-1 text-sm text-red-600">{errors.party_size[0]}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-foreground">
                    {reservation.party_size} {reservation.party_size === 1 ? 'person' : 'people'}
                  </p>
                )}
              </div>

              {/* Guest Info */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editForm.guest_name}
                          onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })}
                          className="block w-full rounded-md border border-input px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={editForm.guest_phone}
                          onChange={(e) => setEditForm({ ...editForm, guest_phone: e.target.value })}
                          className="block w-full rounded-md border border-input px-3 py-2"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">{reservation.guest_name}</p>
                      <p className="text-muted-foreground">{reservation.guest_email}</p>
                      {reservation.guest_phone && (
                        <p className="text-muted-foreground">{reservation.guest_phone}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(reservation.notes || isEditing) && (
                <div className="border-t border-border pt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Special Requests
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="block w-full rounded-md border border-input px-3 py-2"
                      rows={3}
                      placeholder="Any special requests or dietary requirements..."
                    />
                  ) : (
                    <p className="text-muted-foreground">{reservation.notes}</p>
                  )}
                </div>
              )}

              {/* Token Expiry */}
              <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                <p>
                  Manage reservation until:{' '}
                  {new Date(tokenInfo.expires_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Action Buttons */}
              {!isCancelled && !isExpired && (
                <div className="border-t border-border pt-6 flex flex-wrap gap-3">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={modifyMutation.isPending}
                        className="gap-2"
                      >
                        {modifyMutation.isPending ? (
                          'Saving...'
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        disabled={modifyMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleEdit}
                        variant="outline"
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit Reservation
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? (
                          'Cancelling...'
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Cancel Reservation
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {isCancelled && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">This reservation has been cancelled.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
