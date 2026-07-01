import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { Post } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="container" style="padding-top:1.5rem;">
      <h1 style="font-size:1.75rem;margin-bottom:1.5rem;">Latest Posts</h1>
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else if (posts().length === 0) {
        <div class="card" style="text-align:center;padding:3rem;">
          <p class="text-muted">No posts yet.</p>
        </div>
      } @else {
        <div class="card">
          @for (post of posts(); track post.id) {
            <div class="post-list-item">
              @if (post.pinned) {
                <span class="badge" style="background:#fef3c7;color:#92400e;">📌 Pinned</span>
              }
              <h2 style="font-size:1.25rem;margin-bottom:0.3rem;">
                <a [routerLink]="['/post', post.slug]" style="color:#111;">{{ post.title }}</a>
              </h2>
              @if (post.summary) {
                <p style="color:#6b7280;font-size:0.9rem;">{{ post.summary }}</p>
              }
              <div class="post-meta">
                <span>By {{ post.authorName }}</span>
                @if (post.categoryName) {
                  <span class="badge">{{ post.categoryName }}</span>
                }
                <span>{{ post.createdAt | date:'yyyy-MM-dd' }}</span>
                <span>👁 {{ post.viewCount }}</span>
                <span>💬 {{ post.commentCount }}</span>
              </div>
              @if (post.tags.length) {
                <div class="tag-cloud" style="margin-top:0.5rem;">
                  @for (tag of post.tags; track tag.id) {
                    <a [routerLink]="['/tag', tag.slug]" class="tag-item">{{ tag.name }}</a>
                  }
                </div>
              }
            </div>
          }
        </div>
        @if (totalPages() > 1) {
          <div class="pagination">
            <button [disabled]="page()===1" (click)="goPage(page()-1)">«</button>
            @for (p of pagesArray(); track p) {
              <button [class.active]="p===page()" (click)="goPage(p)">{{ p }}</button>
            }
            <button [disabled]="page()===totalPages()" (click)="goPage(page()+1)">»</button>
          </div>
        }
      }
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  posts = signal<Post[]>([]);
  loading = signal(true);
  page = signal(1);
  totalPages = signal(1);

  ngOnInit() { this.loadPosts(); }

  loadPosts() {
    this.loading.set(true);
    this.api.getPosts({ page: this.page(), page_size: 10, status: 'published' }).subscribe({
      next: (res) => {
        if (res.code === 0 && res.data) {
          this.posts.set(res.data.list);
          this.totalPages.set(Math.ceil(res.data.total / 10));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(p: number) { this.page.set(p); this.loadPosts(); window.scrollTo(0, 0); }
  pagesArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }
}
