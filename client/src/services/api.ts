const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData) => {
  const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Upload failed');
      return res.json() as T;
    });
  },
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: any; token: string }>('/auth/login', { email, password }),
  register: (data: any) =>
    api.post<{ user: any; token: string }>('/auth/register', data),
  sendOtp: (email: string) =>
    api.post<{ message: string }>('/auth/send-otp', { email }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { email, otp, password }),
  me: () => api.get<{ user: any }>('/auth/me'),
};

export const profileApi = {
  get: () => api.get<any>('/profile'),
  update: (data: any) => api.put<any>('/profile', data),
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.upload<{ url: string }>('/profile/photo', formData);
  },
};

export const employmentApi = {
  list: () => api.get<any[]>('/employment'),
  create: (data: any) => api.post<any>('/employment', data),
  update: (id: string, data: any) => api.put<any>(`/employment/${id}`, data),
  delete: (id: string) => api.delete(`/employment/${id}`),
};

export const analyticsApi = {
  overview: () => api.get<any>('/analytics/overview'),
  batchComparison: (batch: number) =>
    api.get<any>(`/analytics/batch/${batch}`),
  industryDistribution: () => api.get<any>('/analytics/industries'),
};

export const mentorshipApi = {
  list: () => api.get<any[]>('/mentorship'),
  apply: (data: any) => api.post<any>('/mentorship/apply', data),
  updateStatus: (id: string, status: string) =>
    api.put<any>(`/mentorship/${id}`, { status }),
};

export const communityApi = {
  groups: () => api.get<any[]>('/community/groups'),
  forums: (groupId: string) =>
    api.get<any[]>(`/community/groups/${groupId}/posts`),
  createPost: (data: any) => api.post<any>('/community/posts', data),
};

export const jobsApi = {
  list: () => api.get<any[]>('/jobs'),
  create: (data: any) => api.post<any>('/jobs', data),
  apply: (jobId: string) => api.post<any>(`/jobs/${jobId}/apply`, {}),
};

export const surveyApi = {
  list: () => api.get<any[]>('/surveys'),
  submit: (surveyId: string, responses: any) =>
    api.post<any>(`/surveys/${surveyId}/respond`, responses),
};

export const adminApi = {
  users: () => api.get<any[]>('/admin/users'),
  updateUser: (id: string, data: any) =>
    api.put<any>(`/admin/users/${id}`, data),
  exportData: (format: string) =>
    api.get<Blob>(`/admin/export?format=${format}`),
};
