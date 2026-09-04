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
  download: (endpoint: string) => {
    const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Download failed');
      }
      return res;
    });
  },
  upload: <T>(endpoint: string, formData: FormData) => {
  const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json() as T;
    });
  },
};

export interface LoginResponse {
  user?: { id: string; email: string; role: 'admin' | 'staff' | 'alumni' };
  token?: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface VerifyAlumniResponse {
  verified: boolean;
  identity?: {
    studentId: string;
    firstName: string;
    lastName: string;
    program: string;
    yearGraduated: string;
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  mfaVerify: (email: string, otp: string, mfaToken: string) =>
    api.post<{ user: any; token: string }>('/auth/mfa-verify', { email, otp, mfaToken }),
  verifyAlumni: (studentId: string, birthDate: string) =>
    api.post<VerifyAlumniResponse>('/auth/verify-alumni', { studentId, birthDate }),
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
  sendMfaCode: (email: string) =>
    api.post<{ message: string }>('/auth/send-mfa-code', { email }),
  enableMfa: (email: string, otp: string) =>
    api.post<{ message: string }>('/auth/enable-mfa', { email, otp }),
  disableMfa: () =>
    api.post<{ message: string }>('/auth/disable-mfa', {}),
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

export const careerTrendsApi = {
  list: (params: Record<string, any> = {}) => api.get<any>(`/career-trends?${toQuery(params)}${Object.keys(params).length ? '&' : ''}_t=${Date.now()}`),
  get: (position: string) => api.get<any>(`/career-trends/${encodeURIComponent(position)}?_t=${Date.now()}`),
  alumni: (type: string, value: string) => api.get<any>(`/career-trends/alumni?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}&_t=${Date.now()}`),
};

export const mentorshipApi = {
  list: () => api.get<any[]>('/mentorship'),
  discover: () => api.get<any[]>('/mentorship/discover'),
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
  myApplications: () => api.get<any[]>('/jobs/my-applications'),
  myApplication: (id: string) => api.get<any>(`/jobs/${id}/my-application`),
  apply: (jobId: string, data: { cover_letter?: string; resume?: File }) => {
    const formData = new FormData();
    if (data.cover_letter) formData.append('cover_letter', data.cover_letter);
    if (data.resume) formData.append('resume', data.resume);
    return api.upload<any>(`/jobs/${jobId}/apply`, formData);
  },
};

export const surveyApi = {
  list: () => api.get<any[]>('/surveys'),
  get: (id: string) => api.get<any>(`/surveys/${id}`),
  getActive: () => api.get<any>('/surveys/active'),
  submit: (surveyId: string, responses: any) =>
    api.post<any>(`/surveys/${surveyId}/respond`, { responses }),
};

export const notificationsApi = {
  list: (limit = 20) => api.get<any[]>(`/notifications?limit=${limit}`),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.post<any>(`/notifications/${id}/read`, {}),
  markAllRead: () => api.post<any>('/notifications/mark-all-read', {}),
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
  dashboardUpcomingEvents: () => api.get<any[]>('/admin/dashboard/upcoming-events'),

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
  screenApplication: (applicationId: string, data: { matched_skills: string[]; screening_notes?: string }) =>
    api.put<any>(`/admin/jobs/applications/${applicationId}/screen`, data),
  exportApplicants: (jobId: string) => api.download(`/admin/jobs/${jobId}/applicants/export`),

  surveyList: (params: Record<string, any> = {}) => api.get<any[]>(`/admin/surveys?${toQuery(params)}`),
  surveyCreate: (data: any) => api.post<any>('/admin/surveys', data),
  surveyGet: (id: string) => api.get<any>(`/admin/surveys/${id}`),
  surveyUpdate: (id: string, data: any) => api.put<any>(`/admin/surveys/${id}`, data),
  surveyDelete: (id: string) => api.delete(`/admin/surveys/${id}`),
  surveyActivate: (id: string) => api.put<any>(`/admin/surveys/${id}/activate`, {}),
  surveyDeactivate: (id: string) => api.put<any>(`/admin/surveys/${id}/deactivate`, {}),
  surveyClose: (id: string) => api.put<any>(`/admin/surveys/${id}/close`, {}),
  surveyDuplicate: (id: string) => api.post<any>(`/admin/surveys/${id}/duplicate`, {}),
  surveyAnalytics: (id: string) => api.get<any>(`/admin/surveys/${id}/analytics`),
  surveyResponses: (id: string, params: Record<string, any> = {}) => api.get<any>(`/admin/surveys/${id}/responses?${toQuery(params)}`),
  surveyExportResponses: (id: string) => api.get<Blob>(`/admin/surveys/${id}/responses/export`),
  surveyStandardQuestions: () => api.get<any[]>('/admin/surveys/standard-questions'),

  announcementList: (params: Record<string, any> = {}) => api.get<any>(`/admin/announcements?${toQuery(params)}`),
  announcementCreate: (data: any) => api.post<any>('/admin/announcements', data),
  announcementUpdate: (id: string, data: any) => api.put<any>(`/admin/announcements/${id}`, data),
  announcementDelete: (id: string) => api.delete(`/admin/announcements/${id}`),
  announcementHardDelete: (id: string) => api.delete(`/admin/announcements/${id}?hard=true`),
  announcementRestore: (id: string, status?: string) => api.put<any>(`/admin/announcements/${id}/restore`, { status }),
  announcementPin: (id: string, isPinned: boolean) => api.put<any>(`/admin/announcements/${id}/pin`, { is_pinned: isPinned }),
  announcementPublish: (id: string) => api.put<any>(`/admin/announcements/${id}/publish`, {}),

  reportAlumni: (format = 'json') => api.get<Blob>(`/admin/reports/alumni?format=${format}`),
  reportEmployment: (format = 'json') => api.get<Blob>(`/admin/reports/employment?format=${format}`),
  reportEmployer: (format = 'json') => api.get<Blob>(`/admin/reports/employer?format=${format}`),
  reportSurvey: (id: string, format = 'json') => api.get<Blob>(`/admin/reports/survey/${id}?format=${format}`),
  reportCareerProgress: (format = 'json') => api.get<Blob>(`/admin/reports/career-progress?format=${format}`),

employmentRate: (params: Record<string, any> = {}) => api.get<any>(`/admin/analytics/employment-rate?${toQuery(params)}`),
  employmentByCourse: (params: Record<string, any> = {}) => api.get<any[]>(`/admin/analytics/employment-by-course?${toQuery(params)}`),
  employmentByCourseCsv: () => api.get<Blob>(`/admin/analytics/employment-by-course?format=csv`),
  employmentByBatch: () => api.get<any[]>('/admin/analytics/employment-by-batch'),
  salaryDistribution: () => api.get<any[]>('/admin/analytics/salary-distribution'),
  salaryDistributionCsv: () => api.get<Blob>('/admin/analytics/salary-distribution?format=csv'),
  degreeAlignment: () => api.get<any[]>('/admin/analytics/degree-alignment'),
  degreeAlignmentCsv: () => api.get<Blob>('/admin/analytics/degree-alignment?format=csv'),
  avgTimeEmployment: () => api.get<any>('/admin/analytics/avg-time-employment'),

  userList: (params: Record<string, any> = {}) => api.get<any>(`/admin/users?${toQuery(params)}`),
  userCreate: (data: any) => api.post<any>('/admin/users', data),
  userDisable: (id: string) => api.put<any>(`/admin/users/${id}/disable`, {}),
  userEnable: (id: string) => api.put<any>(`/admin/users/${id}/enable`, {}),
  userSetRole: (id: string, role: string) => api.put<any>(`/admin/users/${id}/role`, { role }),
  userResetPassword: (id: string, newPassword: string) => api.post<any>(`/admin/users/${id}/reset-password`, { newPassword }),
  userLoginHistory: (id: string) => api.get<any[]>(`/admin/users/${id}/login-history`),

  eligibleAlumniList: (params: Record<string, any> = {}) => api.get<any[]>(`/admin/eligible-alumni?${toQuery(params)}`),
  eligibleAlumniCreate: (data: any) => api.post<any>('/admin/eligible-alumni', data),
  eligibleAlumniDelete: (id: string) => api.delete(`/admin/eligible-alumni/${id}`),

  settingsGet: () => api.get<any>('/admin/settings'),
  settingsUpdate: (data: any) => api.put<any>('/admin/settings', data),

  auditLogs: (params: Record<string, any> = {}) => api.get<any>(`/admin/audit-logs?${toQuery(params)}`),

  careerOverview: () => api.get<any>('/admin/analytics/career-overview'),
  careerProgression: () => api.get<any>('/admin/analytics/career-progression'),
  networkingGrowth: () => api.get<any>('/admin/analytics/networking-growth'),
  careerStatistics: (params: Record<string, any> = {}) => api.get<any>(`/admin/analytics/career-statistics?${toQuery(params)}`),

  employerStatistics: (params: Record<string, any> = {}) => api.get<any>(`/admin/employer-insights/statistics?${toQuery(params)}`),
  employerDetail: (name: string) => api.get<any>(`/admin/employer-insights/employer/${encodeURIComponent(name)}`),
  employerUpdatePartnership: (name: string, partnershipStatus: string) => api.put<any>(`/admin/employer-insights/employer/${encodeURIComponent(name)}/partnership`, { partnership_status: partnershipStatus }),

  curriculumStatistics: (params: Record<string, any> = {}) => api.get<any>(`/admin/curriculum-insights/statistics?${toQuery(params)}`),
};

export const connectionsApi = {
  list: (status?: string) => api.get<any[]>(`/connections${status ? `?status=${status}` : ''}`),
  request: (recipientId: string, message?: string) => api.post<any>('/connections/request', { recipient_id: recipientId, message }),
  respond: (id: string, status: string) => api.put<any>(`/connections/${id}/respond`, { status }),
  remove: (id: string) => api.delete(`/connections/${id}`),
  suggestions: () => api.get<any[]>('/connections/suggestions'),
};

export const messagesApi = {
  send: (receiverId: string, body: string, subject?: string, connectionId?: string) =>
    api.post<any>('/messages', { receiver_id: receiverId, body, subject, connection_id: connectionId }),
};

export const feedApi = {
  list: (sort?: string) => api.get<any[]>(`/feed${sort ? `?sort=${sort}` : ''}`),
  get: (id: string) => api.get<any>(`/feed/${id}`),
};

export const activitiesApi = {
  list: (limit?: number) => api.get<any[]>(`/activities${limit ? `?limit=${limit}` : ''}`),
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
  programs: () => api.get<string[]>('/directory/programs'),
};

export const publicApi = {
  stats: () => api.get<{ totalAlumni: number; employmentRate: number; mentorshipMatches: number; programsTracked: number }>('/public/stats'),
};
