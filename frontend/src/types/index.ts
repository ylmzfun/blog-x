export interface User {
  id: number
  username: string
  email: string
  avatar: string
  bio: string
  website: string
  role: 'admin' | 'author' | 'user'
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Post {
  id: number
  title: string
  slug: string
  content: string
  summary: string
  cover: string
  authorId: number
  author?: User
  categoryId: number | null
  category?: Category
  status: 'published' | 'draft'
  pinned: boolean
  viewCount: number
  commentCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  name: string
  slug: string
  postCount: number
  createdAt: string
}

export interface Comment {
  id: number
  postId: number
  authorId: number
  author?: User
  content: string
  parentId: number | null
  children?: Comment[]
  status: 'approved' | 'pending' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface PaginatedData<T = unknown> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
