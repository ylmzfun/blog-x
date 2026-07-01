import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { Overview, TopPost } from '../../../core/models';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">Statistics</h1>
    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else {
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">{{ overview()?.postCount ?? 0 }}</div><div class="stat-label">Total Posts</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview()?.commentCount ?? 0 }}</div><div class="stat-label">Total Comments</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview()?.userCount ?? 0 }}</div><div class="stat-label">Users</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview()?.totalViews ?? 0 }}</div><div class="stat-label">Total Views</div></div>
      </div>
      <div class="card">
        <h2 style="font-size:1.15rem;margin-bottom:1rem;">Top 10 Articles by Views</h2>
        <table class="table">
          <thead><tr><th>#</th><th>Title</th><th>Views</th></tr></thead>
          <tbody>
            @for (tp of topPosts(); track tp.id; let i = $index) {
              <tr><td>{{ i + 1 }}</td><td><a [routerLink]="['/post', tp.slug]">{{ tp.title }}</a></td><td>{{ tp.viewCount }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class StatsComponent implements OnInit {
  private api = inject(ApiService);
  overview = signal<Overview | null>(null);
  topPosts = signal<TopPost[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.getOverview().subscribe(res => { if (res.code === 0 && res.data) this.overview.set(res.data); });
    this.api.getTopPosts().subscribe(res => { if (res.code === 0 && res.data) this.topPosts.set(res.data); this.loading.set(false); });
  }
}
