const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

interface PaginatedData<T = unknown> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

function getToken(): string | null {
  return localStorage.getItem('accessToken')
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json()
    if (json.code === 0 && json.data) {
      setTokens(json.data.accessToken, json.data.refreshToken)
      return true
    }
  } catch {
    // ignore
  }
  clearTokens()
  window.location.href = '/login'
  return false
}

async function request<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${BASE_URL}${url}`, { ...options, headers })
  let json: ApiResponse<T> = await res.json()

  if (json.code === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const newToken = getToken()
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${BASE_URL}${url}`, { ...options, headers })
      json = await res.json()
    }
  }

  return json
}

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { login: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  logout: () => request('/auth/logout', { method: 'POST' }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; password: string }) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
}

// Users
export const userApi = {
  getMe: () => request('/users/me'),
  updateMe: (data: Record<string, unknown>) =>
    request('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  updatePassword: (data: { oldPassword: string; newPassword: string }) =>
    request('/users/me/password', { method: 'PUT', body: JSON.stringify(data) }),
  getPublic: (id: number) => request(`/users/${id}`),
  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ url: string }>('/upload/avatar', { method: 'POST', body: fd })
  },
}

// Posts
export const postApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedData>('/posts' + qs)
  },
  getBySlug: (slug: string) => request(`/posts/${slug}`),
  create: (data: Record<string, unknown>) =>
    request('/posts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/posts/${id}`, { method: 'DELETE' }),
  drafts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedData>('/posts/drafts' + qs)
  },
  pin: (id: number) => request(`/posts/${id}/pin`, { method: 'PUT' }),
}

// Categories
export const categoryApi = {
  list: () => request('/categories'),
  getBySlug: (slug: string) => request(`/categories/${slug}`),
  create: (data: { name: string; slug: string; description?: string }) =>
    request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; slug: string; description?: string }) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),
}

// Tags
export const tagApi = {
  list: () => request('/tags'),
  create: (data: { name: string; slug: string }) =>
    request('/tags', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/tags/${id}`, { method: 'DELETE' }),
}

// Comments
export const commentApi = {
  list: (postId: number, params?: Record<string, string>) => {
    const allParams = { postId: String(postId), ...params }
    const qs = '?' + new URLSearchParams(allParams).toString()
    return request<PaginatedData>('/comments' + qs)
  },
  create: (data: { postId: number; content: string; parentId?: number }) =>
    request('/comments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/comments/${id}`, { method: 'DELETE' }),
  approve: (id: number) => request(`/comments/${id}/approve`, { method: 'PUT' }),
}

// Search
export const searchApi = {
  search: (q: string, params?: Record<string, string>) => {
    const allParams = { q, ...params }
    const qs = '?' + new URLSearchParams(allParams).toString()
    return request<PaginatedData>('/search' + qs)
  },
  suggestions: (q: string) => request<string[]>(`/search/suggestions?q=${encodeURIComponent(q)}`),
}

// Stats
export const statsApi = {
  overview: () => request('/stats/overview'),
  topPosts: () => request('/stats/posts/top'),
}

// Upload
export const uploadApi = {
  image: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<{ url: string }>('/upload/image', { method: 'POST', body: fd })
  },
}

export { getToken, setTokens, clearTokens, BASE_URL }
export type { ApiResponse, PaginatedData }
