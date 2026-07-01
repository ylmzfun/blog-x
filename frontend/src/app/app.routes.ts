import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'post/:slug',
    loadComponent: () => import('./features/post-detail/post-detail.component').then(m => m.PostDetailComponent),
  },
  {
    path: 'category/:slug',
    loadComponent: () => import('./features/category-posts/category-posts.component').then(m => m.CategoryPostsComponent),
  },
  {
    path: 'tag/:slug',
    loadComponent: () => import('./features/tag-posts/tag-posts.component').then(m => m.TagPostsComponent),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'posts',
        loadComponent: () => import('./features/admin/posts/post-list.component').then(m => m.PostListComponent),
      },
      {
        path: 'posts/new',
        loadComponent: () => import('./features/admin/posts/post-editor.component').then(m => m.PostEditorComponent),
      },
      {
        path: 'posts/:slug/edit',
        loadComponent: () => import('./features/admin/posts/post-editor.component').then(m => m.PostEditorComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/admin/categories/category-list.component').then(m => m.CategoryListComponent),
      },
      {
        path: 'comments',
        loadComponent: () => import('./features/admin/comments/comment-list.component').then(m => m.CommentListComponent),
      },
      {
        path: 'stats',
        loadComponent: () => import('./features/admin/stats/stats.component').then(m => m.StatsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
