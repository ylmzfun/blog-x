import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { Overview, TopPost } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">Dashboard</h1>
    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else {
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">{{ overview()?.postCount ?? 0 }}</div><div class="stat-label">Total Posts</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview()?.commentCount ?? 0 }}</div><div class="stat-label">Total Comments</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview()?.userCount ?? 0 }}</div><div class="stat-label">Registered Users</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview()?.totalViews ?? 0 }}</div><div class="stat-label">Total Views</div></div>
      </div>
      <div class="card" style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.15rem;margin-bottom:0.75rem;">Quick Actions</h2>
        <div class="flex gap-md">
          <a routerLink="/admin/posts/new" class="btn btn-primary btn-sm">New Post</a>
          <a routerLink="/admin/posts" class="btn btn-outline btn-sm">Manage Posts</a>
          <a routerLink="/admin/categories" class="btn btn-outline btn-sm">Manage Categories</a>
        </div>
      </div>
      @if (topPosts().length) {
        <div class="card">
          <h2 style="font-size:1.15rem;margin-bottom:0.75rem;">Top Articles</h2>
          <table class="table">
            <thead><tr><th>Title</th><th>Views</th></tr></thead>
            <tbody>
              @for (tp of topPosts(); track tp.id) {
                <tr><td><a [routerLink]="['/post', tp.slug]" target="_blank">{{ tp.title }}</a></td><td>{{ tp.viewCount }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  overview = signal<Overview | null>(null);
  topPosts = signal<TopPost[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.getOverview().subscribe({ next: (res) => { if (res.code === 0 && res.data) this.overview.set(res.data); } });
    this.api.getTopPosts().subscribe({ next: (res) => { if (res.code === 0 && res.data) this.topPosts.set(res.data); this.loading.set(false); } });
  }
}
