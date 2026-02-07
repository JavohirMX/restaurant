import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  restaurant: ['restaurant'] as const,
  hours: ['hours'] as const,
  gallery: ['gallery'] as const,
  testimonials: ['testimonials'] as const,
  blog: {
    all: ['blog'] as const,
    list: (cursor?: string) => ['blog', 'list', cursor] as const,
    detail: (slug: string) => ['blog', 'detail', slug] as const,
  },
  menu: ['menu'] as const,
  availability: (date: string) => ['availability', date] as const,
  reservation: (token: string) => ['reservation', token] as const,
};
