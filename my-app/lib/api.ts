import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Base axios instance (no automatic auth — each caller passes its own token)
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the selected organization context to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const orgId = localStorage.getItem('devboard-selected-org');
    if (orgId) {
      config.headers['x-organization-id'] = orgId;
    }
  }
  return config;
});

// Global error interceptor — toast on API errors (skip 401 which Clerk handles)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status && status !== 401) {
      const message =
        error.response?.data?.message || error.message || 'An unexpected error occurred';

      // Dynamic import to avoid circular deps and SSR issues
      if (typeof window !== 'undefined') {
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            variant: 'destructive',
            title: `Error ${status}`,
            description: Array.isArray(message) ? message.join(', ') : message,
          });
        });
      }
    }
    return Promise.reject(error);
  }
);

// Comments API
export const fetchComments = async (taskId: string) => {
  const response = await api.get(`/tasks/${taskId}/comments`);
  return response.data;
};

export const createComment = async (taskId: string, body: string) => {
  const response = await api.post(`/tasks/${taskId}/comments`, { body });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/comments/${commentId}`);
};

// Users API — token must be passed explicitly
export const fetchCurrentUser = async (token: string | null) => {
  const response = await api.get('/users/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

export const updateUserProfile = async (
  data: { firstName: string; lastName: string; email: string },
  token: string | null
) => {
  const response = await api.patch('/users/me', data, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};
