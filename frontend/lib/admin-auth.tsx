'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, User, setAccessToken, clearAccessToken, getAccessToken } from './admin-api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canManageContent: boolean;
  canManageReservations: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if current path is public (no auth required)
  const isPublicPath = pathname && PUBLIC_ADMIN_PATHS.includes(pathname);

  // Query for current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin', 'user'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized && !isPublicPath, // Only run after initialization and not on public paths
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      // Check if we have a token in memory
      const token = getAccessToken();
      
      if (!token) {
        // Try to refresh if we're on an admin page
        if (pathname?.startsWith('/admin') && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
          try {
            await authApi.refresh();
            // Refresh successful, user query will run
          } catch {
            // Refresh failed, redirect to login
            if (pathname !== '/admin/login') {
              router.push('/admin/login');
            }
          }
        }
      }
      
      setIsInitialized(true);
    };

    initAuth();
  }, [pathname, router]);

  // Handle auth errors - only redirect if not already on login page
  useEffect(() => {
    if (error && pathname?.startsWith('/admin') && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
      // Prevent redirect loops by checking if we're already navigating to login
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    }
  }, [error, pathname, router]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'user'], data.user);
      router.push('/admin');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAccessToken();
      queryClient.clear();
      router.push('/admin/login');
    },
  });

  const login = useCallback(async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Permission checks
  const canManageContent = user?.permissions.can_manage_content ?? false;
  const canManageReservations = user?.permissions.can_manage_reservations ?? false;
  const canManageSettings = user?.permissions.is_manager ?? false;
  const canManageUsers = user?.permissions.is_admin ?? false;

  const value: AuthContextType = {
    user: user ?? null,
    isLoading: isLoading || !isInitialized,
    isAuthenticated: !!user,
    login,
    logout,
    canManageContent,
    canManageReservations,
    canManageSettings,
    canManageUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth(requireContent = false, requireReservations = false, requireSettings = false, requireAdmin = false) {
  const { isLoading, isAuthenticated, canManageContent, canManageReservations, canManageSettings, canManageUsers } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (requireAdmin && !canManageUsers) {
      router.push('/admin');
      return;
    }

    if (requireSettings && !canManageSettings) {
      router.push('/admin');
      return;
    }

    if (requireReservations && !canManageReservations) {
      router.push('/admin');
      return;
    }

    if (requireContent && !canManageContent) {
      router.push('/admin');
      return;
    }
  }, [isLoading, isAuthenticated, canManageContent, canManageReservations, canManageSettings, canManageUsers, requireContent, requireReservations, requireSettings, requireAdmin, router, pathname]);

  return { isLoading };
}
