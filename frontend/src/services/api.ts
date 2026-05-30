import axios from 'axios';

const API_URL = 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach authorization token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Auth Service endpoints
export const authApi = {
  login: (data: any) => apiClient.post('/auth/login', data),
  changePassword: (data: any) => apiClient.post('/auth/change-password', data),
  forgotPassword: (data: any) => apiClient.post('/auth/forgot-password', data),
  getProfile: () => apiClient.get('/auth/profile'),
};

// Users Service endpoints
export const usersApi = {
  list: (params?: any) => apiClient.get('/users', { params }),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.patch(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
};

// Projects Service endpoints
export const projectsApi = {
  list: () => apiClient.get('/projects'),
  create: (data: any) => apiClient.post('/projects', data),
  update: (id: number, data: any) => apiClient.patch(`/projects/${id}`, data),
  delete: (id: number) => apiClient.delete(`/projects/${id}`),
};

// Tasks Service endpoints
export const tasksApi = {
  list: (params?: any) => apiClient.get('/tasks', { params }),
  get: (id: number) => apiClient.get(`/tasks/${id}`),
  create: (data: any) => apiClient.post('/tasks', data),
  update: (id: number, data: any) => apiClient.patch(`/tasks/${id}`, data),
  delete: (id: number) => apiClient.delete(`/tasks/${id}`),
  checkCarryForward: () => apiClient.get('/tasks/carry-forward-check'),
  handleCarryForward: (data: { taskId: number; carryForward: boolean }) =>
    apiClient.post('/tasks/carry-forward', data),
  getMetrics: () => apiClient.get('/tasks/dashboard-metrics'),
};

// Notifications Service endpoints
export const notificationsApi = {
  list: () => apiClient.get('/notifications'),
  read: (id: number) => apiClient.patch(`/notifications/${id}/read`),
  readAll: () => apiClient.post('/notifications/read-all'),
};

// Messages Service endpoints
export const messagesApi = {
  inbox: () => apiClient.get('/messages/inbox'),
  sent: () => apiClient.get('/messages/sent'),
  create: (data: any) => apiClient.post('/messages', data),
  respond: (id: number, data: { response: string; comment?: string }) =>
    apiClient.post(`/messages/${id}/respond`, data),
  getPendingMandatory: () => apiClient.get('/messages/pending-mandatory'),
};

// Announcements Service endpoints
export const announcementsApi = {
  list: () => apiClient.get('/announcements'),
  create: (data: any) => apiClient.post('/announcements', data),
  acknowledge: (id: number) => apiClient.post(`/announcements/${id}/acknowledge`),
  getAcks: (id: number) => apiClient.get(`/announcements/${id}/acks`),
};

// Leaves Service endpoints
export const leavesApi = {
  list: () => apiClient.get('/leaves'),
  apply: (data: any) => apiClient.post('/leaves', data),
  updateStatus: (id: number, data: { status: string; remarks?: string }) =>
    apiClient.patch(`/leaves/${id}/status`, data),
};

// Reports Service endpoints
export const reportsApi = {
  dailyReview: (date?: string) => apiClient.get('/reports/daily-review', { params: { date } }),
  performance: (params?: any) => apiClient.get('/reports/performance', { params }),
  analytics: () => apiClient.get('/reports/analytics'),
  getExcelUrl: (date?: string) => `${API_URL}/reports/export-excel?date=${date || ''}`,
  getPdfUrl: (date?: string) => `${API_URL}/reports/export-pdf?date=${date || ''}`,
};

// File Uploads service
export const uploadsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getFileUrl: (path: string) => `${API_URL}/${path}`,
};

export default apiClient;
