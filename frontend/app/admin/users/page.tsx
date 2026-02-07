'use client';

import { useRequireAuth, useAuth } from '@/lib/admin-auth';
import { Loading } from '@/components/loading';
import { Users as UsersIcon, Shield, UserCheck, UserCog, Edit } from 'lucide-react';

// Placeholder for user management - requires backend endpoint
export default function UsersPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(false, false, false, true);
  const { user } = useAuth();

  if (isAuthLoading) {
    return <Loading fullScreen />;
  }

  const roles = [
    {
      role: 'admin',
      label: 'Admin',
      description: 'Full access to all features',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      role: 'manager',
      label: 'Manager',
      description: 'Can manage content, reservations, and settings',
      icon: UserCog,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      role: 'host',
      label: 'Host',
      description: 'Can view and manage reservations',
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      role: 'editor',
      label: 'Editor',
      description: 'Can manage content (menu, gallery, blog)',
      icon: Edit,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff accounts and permissions
          </p>
        </div>
      </div>

      {/* Current User */}
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Your Account</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <UsersIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {user?.full_name || user?.email}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                roles.find((r) => r.role === user?.role)?.bgColor
              } ${roles.find((r) => r.role === user?.role)?.color}`}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Role Permissions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {roles.map((role) => (
            <div
              key={role.role}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <div className={`rounded-lg ${role.bgColor} p-2`}>
                <role.icon className={`h-5 w-5 ${role.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{role.label}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
        <p>
          <strong>Note:</strong> User management (creating, editing, deleting
          staff accounts) requires backend implementation. This page shows role
          information for reference.
        </p>
      </div>
    </div>
  );
}
