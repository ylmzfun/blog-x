import { Component, inject, signal, Input, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Post } from '../../core/models';

@Component({
  selector: 'app-category-posts',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="container" style="padding-top:1.5rem;">
      <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">Category: {{ slug }}</h1>
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else if (posts().length === 0) {
        <div class="card" style="text-align:center;padding:3rem;"><p class="text-muted">No posts in this category.</p></div>
      } @else {
        <div class="card">
          @for (post of posts(); track post.id) {
            <div class="post-list-item">
              <h2 style="font-size:1.15rem;">
                <a [routerLink]="['/post', post.slug]" style="color:#111;">{{ post.title }}</a>
              </h2>
              @if (post.summary) { <p style="color:#6b7280;font-size:0.88rem;">{{ post.summary }}</p> }
              <div class="post-meta">
                <span>{{ post.authorName }}</span>
                <span>{{ post.createdAt | date:'yyyy-MM-dd' }}</span>
                <span>👁 {{ post.viewCount }}</span>
              </div>
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
export class CategoryPostsComponent implements OnInit {
  private api = inject(ApiService);
  @Input() slug = '';
  posts = signal<Post[]>([]);
  loading = signal(true);
  page = signal(1);
  totalPages = signal(1);
  private catId: number | null = null;

  ngOnInit() {
    this.api.getCategory(this.slug).subscribe({
      next: (res) => {
        if (res.code === 0 && res.data) { this.catId = res.data.id; this.loadPosts(); }
        else this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadPosts() {
    if (!this.catId) return;
    this.loading.set(true);
    this.api.getPosts({ category_id: this.catId, page: this.page(), page_size: 10, status: 'published' }).subscribe({
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

  goPage(p: number) { this.page.set(p); this.loadPosts(); }
  pagesArray(): number[] { return Array.from({ length: this.totalPages() }, (_, i) => i + 1); }
}
