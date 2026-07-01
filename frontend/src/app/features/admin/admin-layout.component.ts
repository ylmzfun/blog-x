import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <nav class="admin-sidebar">
        <div style="padding:0 1.5rem 1rem;font-weight:700;font-size:1.1rem;">Admin Panel</div>
        <a routerLink="/admin/dashboard" routerLinkActive="active">📊 Dashboard</a>
        <a routerLink="/admin/posts" routerLinkActive="active">📝 Posts</a>
        <a routerLink="/admin/posts/new" routerLinkActive="active">➕ New Post</a>
        <a routerLink="/admin/categories" routerLinkActive="active">📂 Categories</a>
        <a routerLink="/admin/comments" routerLinkActive="active">💬 Comments</a>
        <a routerLink="/admin/stats" routerLinkActive="active">📈 Stats</a>
      </nav>
      <main class="admin-content"><router-outlet /></main>
    </div>
  `,
})
export class AdminLayoutComponent {}
