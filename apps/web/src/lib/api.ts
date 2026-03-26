const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new ApiError(res.status, body.error ?? 'Request failed', body.details);
    // Attach any extra fields from the error body (e.g. fileId for 409 duplicates)
    Object.assign(err, body);
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───

export const auth = {
  register: (data: { email: string; name: string; password: string }) =>
    request<{ user: any; token: string; orgId: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: any; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/auth/me'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    request<any>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  forgotPassword: (email: string) =>
    request<{ message: string; token?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

// ─── Organizations ───

export const orgs = {
  list: () => request<any[]>('/orgs'),
  get: (id: string) => request<any>(`/orgs/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<any>('/orgs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<any>(`/orgs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/orgs/${id}`, { method: 'DELETE' }),
  invite: (orgId: string, email: string, opts?: { role?: string; teamId?: string }) =>
    request<any>(`/orgs/${orgId}/invite`, { method: 'POST', body: JSON.stringify({ email, ...opts }) }),
  updateRole: (orgId: string, userId: string, role: string) =>
    request<any>(`/orgs/${orgId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (orgId: string, userId: string) =>
    request<void>(`/orgs/${orgId}/members/${userId}`, { method: 'DELETE' }),
  stats: (orgId: string) =>
    request<{ memberCount: number; projectCount: number; fileCount: number; commentCount: number }>(`/orgs/${orgId}/stats`),
  activity: (orgId: string, limit = 20) =>
    request<any[]>(`/orgs/${orgId}/activity?limit=${limit}`),
};

// ─── Teams (sub-teams within orgs) ───

export const teams = {
  list: (orgId: string) => request<any[]>(`/orgs/${orgId}/teams`),
  get: (orgId: string, teamId: string) => request<any>(`/orgs/${orgId}/teams/${teamId}`),
  create: (orgId: string, data: { name: string; description?: string; leadId?: string }) =>
    request<any>(`/orgs/${orgId}/teams`, { method: 'POST', body: JSON.stringify(data) }),
  update: (orgId: string, teamId: string, data: { name?: string; description?: string; leadId?: string | null }) =>
    request<any>(`/orgs/${orgId}/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (orgId: string, teamId: string) =>
    request<void>(`/orgs/${orgId}/teams/${teamId}`, { method: 'DELETE' }),
  addMember: (orgId: string, teamId: string, userId: string, role?: string) =>
    request<any>(`/orgs/${orgId}/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) }),
  updateMemberRole: (orgId: string, teamId: string, userId: string, role: string) =>
    request<any>(`/orgs/${orgId}/teams/${teamId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (orgId: string, teamId: string, userId: string) =>
    request<void>(`/orgs/${orgId}/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  getPermissions: (orgId: string, teamId: string) =>
    request<Record<string, boolean>>(`/orgs/${orgId}/teams/${teamId}/permissions`),
  updatePermissions: (orgId: string, teamId: string, permissions: Record<string, boolean>) =>
    request<Record<string, boolean>>(`/orgs/${orgId}/teams/${teamId}/permissions`, {
      method: 'PUT', body: JSON.stringify(permissions),
    }),
  getNotifications: (orgId: string, teamId: string) =>
    request<{ settings: Record<string, boolean>; delivery: string }>(`/orgs/${orgId}/teams/${teamId}/notifications`),
  updateNotifications: (orgId: string, teamId: string, data: { settings: Record<string, boolean>; delivery: string }) =>
    request<any>(`/orgs/${orgId}/teams/${teamId}/notifications`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
};

// ─── Notifications ───

export const notifications = {
  list: (opts?: { limit?: number; offset?: number; unread?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    if (opts?.unread) params.set('unread', 'true');
    const qs = params.toString();
    return request<any[]>(`/notifications${qs ? `?${qs}` : ''}`);
  },
  unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    request<any>('/notifications/read-all', { method: 'POST' }),
};

// ─── Projects ───

export const projects = {
  list: (orgId: string) => request<any[]>(`/orgs/${orgId}/projects`),
  get: (id: string) => request<any>(`/projects/${id}`),
  create: (orgId: string, data: { name: string; description?: string }) =>
    request<any>(`/orgs/${orgId}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archive: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
};

// ─── Files ───

export const files = {
  list: (projectId: string) => request<any[]>(`/projects/${projectId}/files`),
  get: (id: string) => request<any>(`/files/${id}`),
  getContent: (id: string, versionId?: string) =>
    request<any>(`/files/${id}/content${versionId ? `?versionId=${versionId}` : ''}`),
  getFrames: (id: string) =>
    request<{ frames: any[]; versionId: string; versionNumber: number }>(`/files/${id}/frames`),
  getSingleFrame: (id: string, frameId: string) =>
    request<any>(`/files/${id}/frames/${frameId}`),
  checkDuplicate: (projectId: string, checksum: string) =>
    request<{ exists: boolean; fileId?: string }>(`/projects/${projectId}/files/check-duplicate?checksum=${checksum}`),
  upload: (projectId: string, file: File, images: File[] = []) => {
    const form = new FormData();
    form.append('file', file);
    for (const img of images) form.append('images', img);
    return request<any>(`/projects/${projectId}/files`, { method: 'POST', body: form });
  },
  download: (id: string, versionId?: string) =>
    request<{ url: string; filename: string }>(`/files/${id}/download${versionId ? `?versionId=${versionId}` : ''}`),
  remove: (id: string) => request<void>(`/files/${id}`, { method: 'DELETE' }),
  uploadVersion: (fileId: string, file: File, images: File[] = [], commitMessage?: string) => {
    const form = new FormData();
    form.append('file', file);
    for (const img of images) form.append('images', img);
    if (commitMessage) form.append('commitMessage', commitMessage);
    return request<any>(`/files/${fileId}/versions`, { method: 'POST', body: form });
  },
  listVersions: (fileId: string) => request<any[]>(`/files/${fileId}/versions`),
};

// ─── Comments ───

export interface AnchorMeta {
  name?: string | null;
  type: string;
  parentId?: string | null;
  bbox: { x: number | null; y: number | null; w: number | null; h: number | null };
}

export const comments = {
  list: (fileId: string, opts: { frameId?: string; versionId?: string } = {}) => {
    const q = new URLSearchParams();
    if (opts.frameId) q.set('frameId', opts.frameId);
    if (opts.versionId) q.set('versionId', opts.versionId);
    const qs = q.toString();
    return request<any[]>(`/files/${fileId}/comments${qs ? `?${qs}` : ''}`);
  },
  create: (fileId: string, data: {
    body: string;
    versionId?: string;
    parentCommentId?: string;
    frameId?: string;
    pinXRatio?: number;
    pinYRatio?: number;
    nodeId?: string;
    anchorMeta?: AnchorMeta;
  }) =>
    request<any>(`/files/${fileId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  resolve: (commentId: string) =>
    request<any>(`/comments/${commentId}/resolve`, { method: 'POST' }),
  remove: (commentId: string) =>
    request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
};

// ─── Share ───

export const share = {
  list: (fileId: string) => request<any[]>(`/files/${fileId}/share-links`),
  create: (fileId: string, data: { permission: string; expiresInDays?: number }) =>
    request<any>(`/files/${fileId}/share-links`, { method: 'POST', body: JSON.stringify(data) }),
  revoke: (linkId: string) =>
    request<void>(`/share-links/${linkId}`, { method: 'DELETE' }),
  getShared: (token: string) => request<any>(`/shared/${token}`),
};

export { ApiError };
