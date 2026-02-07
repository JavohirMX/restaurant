import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  menuApi,
  galleryApi,
  testimonialApi,
  blogApi,
  reservationApi,
  settingsApi,
  authApi,
  ReservationFilters,
} from './admin-api';

// Auth queries
export const useMe = () => {
  return useQuery({
    queryKey: ['admin', 'user'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

// Menu queries
export const useMenuCategories = () => {
  return useQuery({
    queryKey: ['admin', 'menu', 'categories'],
    queryFn: menuApi.getCategories,
    staleTime: 60 * 1000,
  });
};

export const useMenuItems = () => {
  return useQuery({
    queryKey: ['admin', 'menu', 'items'],
    queryFn: menuApi.getItems,
    staleTime: 60 * 1000,
  });
};

// Menu mutations
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof menuApi.updateCategory>[1] }) =>
      menuApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useReorderCategories = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.reorderCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof menuApi.updateItem>[1] }) =>
      menuApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useCreateVariant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.createVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useUpdateVariant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof menuApi.updateVariant>[1] }) =>
      menuApi.updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

export const useDeleteVariant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: menuApi.deleteVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menu', 'categories'] });
    },
  });
};

// Gallery queries
export const useGalleryImages = () => {
  return useQuery({
    queryKey: ['admin', 'gallery'],
    queryFn: galleryApi.getImages,
    staleTime: 60 * 1000,
  });
};

// Gallery mutations
export const useCreateImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.createImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gallery'] });
    },
  });
};

export const useUpdateImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof galleryApi.updateImage>[1] }) =>
      galleryApi.updateImage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gallery'] });
    },
  });
};

export const useDeleteImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gallery'] });
    },
  });
};

export const useReorderImages = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.reorderImages,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'gallery'] });
    },
  });
};

// Testimonial queries
export const useTestimonials = () => {
  return useQuery({
    queryKey: ['admin', 'testimonials'],
    queryFn: testimonialApi.getTestimonials,
    staleTime: 60 * 1000,
  });
};

// Testimonial mutations
export const useCreateTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testimonialApi.createTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
    },
  });
};

export const useUpdateTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof testimonialApi.updateTestimonial>[1] }) =>
      testimonialApi.updateTestimonial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
    },
  });
};

export const useDeleteTestimonial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testimonialApi.deleteTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
    },
  });
};

export const useReorderTestimonials = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testimonialApi.reorderTestimonials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
    },
  });
};

// Blog queries
export const useBlogPosts = () => {
  return useQuery({
    queryKey: ['admin', 'blog'],
    queryFn: blogApi.getPosts,
    staleTime: 60 * 1000,
  });
};

export const useBlogPost = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'blog', id],
    queryFn: () => blogApi.getPost(id),
    staleTime: 60 * 1000,
  });
};

// Blog mutations
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof blogApi.updatePost>[1] }) =>
      blogApi.updatePost(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog', variables.id] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });
};

export const usePublishPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.publishPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });
};

export const useUnpublishPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.unpublishPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    },
  });
};

// Reservation queries
export const useReservations = (filters?: ReservationFilters) => {
  return useQuery({
    queryKey: ['admin', 'reservations', filters],
    queryFn: () => reservationApi.getReservations(filters),
    staleTime: 30 * 1000, // 30 seconds for more real-time feel
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useReservation = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'reservations', id],
    queryFn: () => reservationApi.getReservation(id),
    staleTime: 30 * 1000,
  });
};

// Reservation mutations
export const useApproveReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reservationApi.approveReservation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations', id] });
    },
  });
};

export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      reservationApi.cancelReservation(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations', variables.id] });
    },
  });
};

// Settings queries
export const useHours = () => {
  return useQuery({
    queryKey: ['admin', 'hours'],
    queryFn: settingsApi.getHours,
    staleTime: 5 * 60 * 1000,
  });
};

export const useReservationSettings = () => {
  return useQuery({
    queryKey: ['admin', 'reservation-settings'],
    queryFn: settingsApi.getReservationSettings,
    staleTime: 5 * 60 * 1000,
  });
};

// Settings mutations
export const useCreateHour = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createHour,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hours'] });
    },
  });
};

export const useUpdateHour = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof settingsApi.updateHour>[1] }) =>
      settingsApi.updateHour(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hours'] });
    },
  });
};

export const useDeleteHour = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.deleteHour,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hours'] });
    },
  });
};

export const useUpdateReservationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.updateReservationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservation-settings'] });
    },
  });
};
