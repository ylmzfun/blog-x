export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  role: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  cover?: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  categoryId?: number;
  categoryName?: string;
  status: string;
  pinned: boolean;
  viewCount: number;
  commentCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: TagInfo[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  postCount: number;
  createdAt: string;
}

export interface TagInfo {
  id: number;
  name: string;
  slug: string;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  content: string;
  parentId?: number;
  status: string;
  createdAt: string;
  children: Comment[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Overview {
  postCount: number;
  commentCount: number;
  userCount: number;
  todayPv: number;
  todayUv: number;
  totalViews: number;
}

export interface TopPost {
  id: number;
  title: string;
  slug: string;
  viewCount: number;
}
