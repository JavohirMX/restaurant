'use client';

import { useAuth } from '@/lib/admin-auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut, User } from 'lucide-react';
import { useState } from 'react';

export function AdminHeader() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[var(--badge-cancelled-bg)] text-[var(--badge-cancelled-fg)]';
      case 'manager':
        return 'bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]';
      case 'host':
        return 'bg-[var(--badge-confirmed-bg)] text-[var(--badge-confirmed-fg)]';
      case 'editor':
        return 'bg-[var(--badge-pending-bg)] text-[var(--badge-pending-fg)]';
      default:
        return 'bg-muted text-foreground';
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground">
        Restaurant Admin
      </h1>

      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">
              {user?.full_name || user?.email}
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRoleBadgeColor(
                user?.role || ''
              )}`}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-muted disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>
    </header>
  );
}
