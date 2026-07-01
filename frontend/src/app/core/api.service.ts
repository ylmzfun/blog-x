import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  ApiResponse, PageData, User, Post, Category, Tag,
  Comment, LoginResponse, Overview, TopPost,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // Auth
  register(data: { username: string; email: string; password: string }) {
    return this.http.post<ApiResponse<null>>(`${this.base}/auth/register`, data);
  }
  login(data: { account: string; password: string }) {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.base}/auth/login`, data);
  }
  refresh(body: { refresh_token: string }) {
    return this.http.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${this.base}/auth/refresh`, body
    );
  }
  logout() {
    return this.http.post<ApiResponse<null>>(`${this.base}/auth/logout`, {});
  }

  // Users
  getMe() {
    return this.http.get<ApiResponse<User>>(`${this.base}/users/me`);
  }
  updateMe(data: { username?: string; bio?: string; website?: string }) {
    return this.http.put<ApiResponse<null>>(`${this.base}/users/me`, data);
  }
  changePassword(data: { old_password: string; new_password: string }) {
    return this.http.put<ApiResponse<null>>(`${this.base}/users/me/password`, data);
  }
  getUser(id: number) {
    return this.http.get<ApiResponse<User>>(`${this.base}/users/${id}`);
  }
  uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(`${this.base}/upload/avatar`, fd);
  }

  // Posts
  getPosts(params?: Record<string, string | number | null>) {
    let p = new HttpParams();
    if (params) {
      for (const k of Object.keys(params)) {
        const v = params[k];
        if (v != null) p = p.set(k, String(v));
      }
    }
    return this.http.get<ApiResponse<PageData<Post>>>(`${this.base}/posts`, { params: p });
  }
  getPost(slug: string) {
    return this.http.get<ApiResponse<Post>>(`${this.base}/posts/${slug}`);
  }
  createPost(data: Record<string, unknown>) {
    return this.http.post<ApiResponse<Post>>(`${this.base}/posts`, data);
  }
  updatePost(id: number, data: Record<string, unknown>) {
    return this.http.put<ApiResponse<Post>>(`${this.base}/posts/${id}`, data);
  }
  deletePost(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/posts/${id}`);
  }
  getDrafts() {
    return this.http.get<ApiResponse<Post[]>>(`${this.base}/posts/drafts`);
  }
  togglePin(id: number) {
    return this.http.put<ApiResponse<null>>(`${this.base}/posts/${id}/pin`, {});
  }

  // Categories
  getCategories() {
    return this.http.get<ApiResponse<Category[]>>(`${this.base}/categories`);
  }
  getCategory(slug: string) {
    return this.http.get<ApiResponse<Category>>(`${this.base}/categories/${slug}`);
  }
  createCategory(data: { name: string; slug: string; description?: string }) {
    return this.http.post<ApiResponse<Category>>(`${this.base}/categories`, data);
  }
  updateCategory(id: number, data: Record<string, string | undefined>) {
    return this.http.put<ApiResponse<null>>(`${this.base}/categories/${id}`, data);
  }
  deleteCategory(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/categories/${id}`);
  }

  // Tags
  getTags() {
    return this.http.get<ApiResponse<Tag[]>>(`${this.base}/tags`);
  }
  createTag(data: { name: string; slug: string }) {
    return this.http.post<ApiResponse<Tag>>(`${this.base}/tags`, data);
  }
  deleteTag(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/tags/${id}`);
  }

  // Comments
  getComments(postId: number, params?: Record<string, string | number>) {
    let p = new HttpParams();
    if (params) {
      for (const k of Object.keys(params)) {
        p = p.set(k, String(params[k]));
      }
    }
    return this.http.get<ApiResponse<PageData<Comment>>>(`${this.base}/posts/${postId}/comments`, { params: p });
  }
  createComment(postId: number, data: { content: string; parent_id?: number }) {
    return this.http.post<ApiResponse<Comment>>(`${this.base}/posts/${postId}/comments`, data);
  }
  deleteComment(id: number) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/comments/${id}`);
  }
  approveComment(id: number) {
    return this.http.put<ApiResponse<null>>(`${this.base}/comments/${id}/approve`, {});
  }

  // Search
  search(q: string, page = 1, pageSize = 10) {
    const params = new HttpParams()
      .set('q', q)
      .set('page', String(page))
      .set('page_size', String(pageSize));
    return this.http.get<ApiResponse<PageData<Post>>>(`${this.base}/search`, { params });
  }
  suggest(q: string) {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/search/suggestions`, {
      params: { q },
    });
  }

  // Stats (admin)
  getOverview() {
    return this.http.get<ApiResponse<Overview>>(`${this.base}/stats/overview`);
  }
  getTopPosts() {
    return this.http.get<ApiResponse<TopPost[]>>(`${this.base}/stats/posts/top`);
  }

  // Upload
  uploadImage(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(`${this.base}/upload/image`, fd);
  }
}
