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

  const url = `${API_BASE}${endpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  const response = await fetch(url, {
    ...options,
    headers,
  });
  console.log(`[API] ${response.status} ${response.statusText}`);

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
  sendOtp: (email: string, turnstileToken?: string) =>
    api.post<{ message: string }>('/auth/send-otp', { email, turnstileToken }),
  forgotPassword: (email: string, turnstileToken?: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email, turnstileToken }),
  resetPassword: (email: string, otp: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { email, otp, password }),
  me: () => api.get<{ user: any }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
  sendVerificationEmail: () =>
    api.post<{ message: string }>('/auth/send-verification', {}),
  verifyEmail: (otp: string) =>
    api.post<{ message: string }>('/auth/verify-email', { otp }),
};

export const profileApi = {
  get: () => api.get<any>('/profile'),
  update: (data: any) => api.put<any>('/profile', data),
  updateCareer: (data: any) => api.put<any>('/profile/career', data),
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.upload<{ url: string }>('/profile/photo', formData);
  },
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.upload<{ url: string }>('/profile/resume', formData);
  },
  deleteResume: () => api.delete<{ success: boolean }>('/profile/resume'),
  addSkill: (data: any) => api.post<any>('/profile/skills', data),
  deleteSkill: (id: string) => api.delete(`/profile/skills/${id}`),
  batchSkills: (skills: any[]) => api.put<any[]>('/profile/skills/batch', { skills }),
  addEducation: (data: any) => api.post<any>('/profile/education', data),
  updateEducation: (id: string, data: any) => api.put<any>(`/profile/education/${id}`, data),
  deleteEducation: (id: string) => api.delete(`/profile/education/${id}`),
  // Certifications
  addCertification: (data: any) => api.post<any>('/profile/certifications', data),
  updateCertification: (id: string, data: any) => api.put<any>(`/profile/certifications/${id}`, data),
  deleteCertification: (id: string) => api.delete(`/profile/certifications/${id}`),
  // Achievements
  listAchievements: () => api.get<any[]>('/profile/achievements'),
  addAchievement: (data: any) => api.post<any>('/profile/achievements', data),
  deleteAchievement: (id: string) => api.delete(`/profile/achievements/${id}`),
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
  statistics: () => api.get<any>('/analytics/statistics'),
  salaryStatistics: () => api.get<any>('/analytics/salary-statistics'),
  userCareerStats: () => api.get<any>('/analytics/user-career-stats'),
  industryTrends: () => api.get<any>('/analytics/industry-trends'),
  employmentTimeSeries: () => api.get<any>('/analytics/employment-time-series'),
};

export const careerTrendsApi = {
  list: () => api.get<any>(`/career-trends?_t=${Date.now()}`),
  get: (position: string) => api.get<any>(`/career-trends/${encodeURIComponent(position)}?_t=${Date.now()}`),
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
  get: (id: string) => api.get<any>(`/jobs/${id}`),
  create: (data: any) => api.post<any>('/jobs', data),
  savedList: () => api.get<any[]>('/jobs/saved/list'),
  save: (jobId: string) => api.post<any>(`/jobs/saved/${jobId}`, {}),
  unsave: (jobId: string) => api.delete<any>(`/jobs/saved/${jobId}`),
};

export const surveyApi = {
  list: () => api.get<any[]>('/surveys'),
  submit: (surveyId: string, responses: any) =>
    api.post<any>(`/surveys/${surveyId}/respond`, responses),
};

function toQuery(obj: Record<string, any>) {
  return Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export const adminApi = {
  users: () => api.get<any[]>('/admin/users'),
  updateUser: (id: string, data: any) => api.put<any>(`/admin/users/${id}`, data),
  exportData: (format: string) => api.get<Blob>(`/admin/export?format=${format}`),

  dashboardStats: () => api.get<any>('/admin/dashboard/stats'),
  dashboardCharts: () => api.get<any>('/admin/dashboard/charts'),

  alumniList: (params: Record<string, any> = {}) => api.get<any>(`/admin/alumni?${toQuery(params)}`),
  alumniGet: (id: string) => api.get<any>(`/admin/alumni/${id}`),
  alumniCreate: (data: any) => api.post<any>('/admin/alumni', data),
  alumniUpdate: (id: string, data: any) => api.put<any>(`/admin/alumni/${id}`, data),
  alumniDelete: (id: string) => api.delete(`/admin/alumni/${id}`),
  alumniArchive: (id: string) => api.put<any>(`/admin/alumni/${id}/archive`, {}),
  alumniRestore: (id: string) => api.put<any>(`/admin/alumni/${id}/restore`, {}),
  alumniVerify: (id: string) => api.put<any>(`/admin/alumni/${id}/verify`, {}),
  alumniResetPassword: (id: string, newPassword: string) => api.post<any>(`/admin/alumni/${id}/reset-password`, { newPassword }),
  alumniEmployment: (id: string) => api.get<any[]>(`/admin/alumni/${id}/employment`),
  alumniExport: (format = 'csv') => api.get<Blob>(`/admin/alumni/export?format=${format}`),

  companyList: (params: Record<string, any> = {}) => api.get<any>(`/admin/companies?${toQuery(params)}`),
  companyCreate: (data: any) => api.post<any>('/admin/companies', data),
  companyUpdate: (id: string, data: any) => api.put<any>(`/admin/companies/${id}`, data),
  companyVerify: (id: string) => api.put<any>(`/admin/companies/${id}/verify`, {}),
  companyDelete: (id: string) => api.delete(`/admin/companies/${id}`),

  jobCreate: (data: any) => api.post<any>('/admin/jobs', data),
  jobList: (params: Record<string, any> = {}) => api.get<any>(`/admin/jobs?${toQuery(params)}`),
  jobUpdate: (id: string, data: any) => api.put<any>(`/admin/jobs/${id}`, data),
  jobDelete: (id: string) => api.delete(`/admin/jobs/${id}`),
  jobClose: (id: string) => api.put<any>(`/admin/jobs/${id}/close`, {}),
  jobApplicants: (id: string) => api.get<any[]>(`/admin/jobs/${id}/applicants`),
  jobUpdateApplicantStatus: (applicationId: string, status: string) => api.put<any>(`/admin/jobs/applications/${applicationId}/status`, { status }),

  surveyList: () => api.get<any[]>('/admin/surveys'),
  surveyCreate: (data: any) => api.post<any>('/admin/surveys', data),
  surveyUpdate: (id: string, data: any) => api.put<any>(`/admin/surveys/${id}`, data),
  surveyDelete: (id: string) => api.delete(`/admin/surveys/${id}`),
  surveyActivate: (id: string) => api.put<any>(`/admin/surveys/${id}/activate`, {}),
  surveyDeactivate: (id: string) => api.put<any>(`/admin/surveys/${id}/deactivate`, {}),
  surveyResponses: (id: string, params: Record<string, any> = {}) => api.get<any>(`/admin/surveys/${id}/responses?${toQuery(params)}`),
  surveyExportResponses: (id: string) => api.get<Blob>(`/admin/surveys/${id}/responses/export`),

  announcementList: (params: Record<string, any> = {}) => api.get<any>(`/admin/announcements?${toQuery(params)}`),
  announcementCreate: (data: any) => api.post<any>('/admin/announcements', data),
  announcementUpdate: (id: string, data: any) => api.put<any>(`/admin/announcements/${id}`, data),
  announcementDelete: (id: string) => api.delete(`/admin/announcements/${id}`),
  announcementPin: (id: string, isPinned: boolean) => api.put<any>(`/admin/announcements/${id}/pin`, { is_pinned: isPinned }),
  announcementPublish: (id: string) => api.put<any>(`/admin/announcements/${id}/publish`, {}),

  reportAlumni: (format = 'json') => api.get<Blob>(`/admin/reports/alumni?format=${format}`),
  reportEmployment: (format = 'json') => api.get<Blob>(`/admin/reports/employment?format=${format}`),
  reportEmployer: (format = 'json') => api.get<Blob>(`/admin/reports/employer?format=${format}`),
  reportSurvey: (id: string, format = 'json') => api.get<Blob>(`/admin/reports/survey/${id}?format=${format}`),
  reportCareerProgress: (format = 'json') => api.get<Blob>(`/admin/reports/career-progress?format=${format}`),

  employmentRate: (params: Record<string, any> = {}) => api.get<any>(`/admin/analytics/employment-rate?${toQuery(params)}`),
  employmentByCourse: (params: Record<string, any> = {}) => api.get<any[]>(`/admin/analytics/employment-by-course?${toQuery(params)}`),
  employmentByBatch: () => api.get<any[]>('/admin/analytics/employment-by-batch'),
  industryDistribution: () => api.get<any[]>('/admin/analytics/industry-distribution'),
  topEmployers: () => api.get<any[]>('/admin/analytics/top-employers'),
  salaryDistribution: () => api.get<any[]>('/admin/analytics/salary-distribution'),
  degreeAlignment: () => api.get<any[]>('/admin/analytics/degree-alignment'),
  avgTimeEmployment: () => api.get<any>('/admin/analytics/avg-time-employment'),

  userList: (params: Record<string, any> = {}) => api.get<any>(`/admin/users?${toQuery(params)}`),
  userCreate: (data: any) => api.post<any>('/admin/users', data),
  userDisable: (id: string) => api.put<any>(`/admin/users/${id}/disable`, {}),
  userEnable: (id: string) => api.put<any>(`/admin/users/${id}/enable`, {}),
  userSetRole: (id: string, role: string) => api.put<any>(`/admin/users/${id}/role`, { role }),
  userResetPassword: (id: string, newPassword: string) => api.post<any>(`/admin/users/${id}/reset-password`, { newPassword }),
  userLoginHistory: (id: string) => api.get<any[]>(`/admin/users/${id}/login-history`),

  settingsGet: () => api.get<any>('/admin/settings'),
  settingsUpdate: (data: any) => api.put<any>('/admin/settings', data),

  auditLogs: (params: Record<string, any> = {}) => api.get<any>(`/admin/audit-logs?${toQuery(params)}`),

  careerOverview: () => api.get<any>('/admin/analytics/career-overview'),
  careerProgression: () => api.get<any>('/admin/analytics/career-progression'),
  networkingGrowth: () => api.get<any>('/admin/analytics/networking-growth'),
  careerStatistics: (params: Record<string, any> = {}) => api.get<any>(`/admin/analytics/career-statistics?${toQuery(params)}`),
};

export const connectionsApi = {
  list: (status?: string) => api.get<any[]>(`/connections${status ? `?status=${status}` : ''}`),
  request: (recipientId: string, message?: string) => api.post<any>('/connections/request', { recipient_id: recipientId, message }),
  respond: (id: string, status: string) => api.put<any>(`/connections/${id}/respond`, { status }),
  remove: (id: string) => api.delete(`/connections/${id}`),
  suggestions: () => api.get<any[]>('/connections/suggestions'),
};

export const messagesApi = {
  list: () => api.get<any[]>('/messages'),
  conversations: () => api.get<any[]>('/messages/conversations'),
  get: (profileId: string) => api.get<any[]>(`/messages/${profileId}`),
  send: (receiverId: string, body: string, subject?: string, connectionId?: string) =>
    api.post<any>('/messages', { receiver_id: receiverId, body, subject, connection_id: connectionId }),
  unreadCount: () => api.get<{ count: number }>('/messages/unread/count'),
};

export const referralsApi = {
  list: () => api.get<any[]>('/referrals'),
  create: (data: { recipient_id: string; job_id?: string; company_id?: string; position_title?: string; company_name?: string; message?: string }) =>
    api.post<any>('/referrals', data),
  respond: (id: string, status: string) => api.put<any>(`/referrals/${id}/respond`, { status }),
  count: () => api.get<{ count: number }>('/referrals/count'),
};

export const networkingApi = {
  alumniAtCompany: (companyId: string) => api.get<any[]>(`/networking/alumni-at-company/${companyId}`),
  alumniAtCompanyName: (companyName: string) => api.get<any[]>(`/networking/alumni-at-company-name/${encodeURIComponent(companyName)}`),
  stats: () => api.get<any>('/networking/stats'),
  companyProfile: (companyId: string) => api.get<any>(`/networking/company/${companyId}`),
  jobAlumni: (jobId: string) => api.get<any[]>(`/networking/job-alumni/${jobId}`),
};

export const feedApi = {
  list: (sort?: string) => api.get<any[]>(`/feed${sort ? `?sort=${sort}` : ''}`),
  get: (id: string) => api.get<any>(`/feed/${id}`),
  addComment: (postId: string, content: string) => api.post<any>(`/feed/${postId}/comments`, { content }),
  toggleLike: (postId: string) => api.post<any>(`/feed/${postId}/like`, {}),
  myComments: () => api.get<any[]>('/feed/comments/mine'),
  deleteComment: (commentId: string) => api.delete(`/feed/comments/${commentId}`),
};

export const activitiesApi = {
  list: (limit?: number) => api.get<any[]>(`/activities${limit ? `?limit=${limit}` : ''}`),
  add: (data: { user: string; action: string; target: string }) => api.post<any>('/activities', data),
};

export const eventsApi = {
  list: () => api.get<any[]>('/events'),
};

export const announcementsApi = {
  list: () => api.get<any[]>('/announcements'),
};

export const directoryApi = {
  search: (params: { q?: string; page?: number; limit?: number; program?: string; batch?: string; employment_status?: string; industry?: string; company?: string; location?: string; sort?: string }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v.toString()); });
    return api.get<{ data: any[]; total: number; page: number; limit: number }>(`/directory/search?${query.toString()}`);
  },
  get: (id: string) => api.get<any>(`/directory/${id}`),
  stats: () => api.get<{ totalAlumni: number; currentlyEmployed: number; employmentRate: number; programs: number }>('/directory/stats'),
};
