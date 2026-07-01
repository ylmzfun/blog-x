import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { Post } from '../../../core/models';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="flex justify-between items-center" style="margin-bottom:1.5rem;">
      <h1 style="font-size:1.5rem;">Posts</h1>
      <a routerLink="/admin/posts/new" class="btn btn-primary btn-sm">+ New Post</a>
    </div>
    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else if (posts().length === 0) {
      <div class="card" style="text-align:center;padding:3rem;"><p class="text-muted">No posts yet.</p></div>
    } @else {
      <div class="card" style="padding:0;">
        <table class="table">
          <thead><tr><th>Title</th><th>Status</th><th>Category</th><th>Views</th><th>Comments</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            @for (post of posts(); track post.id) {
              <tr>
                <td>@if (post.pinned) {📌 } {{ post.title }}</td>
                <td><span class="badge" [style.background]="post.status==='published'?'#d1fae5':'#fef3c7'" [style.color]="post.status==='published'?'#065f46':'#92400e'">{{ post.status }}</span></td>
                <td>{{ post.categoryName || '-' }}</td>
                <td>{{ post.viewCount }}</td>
                <td>{{ post.commentCount }}</td>
                <td class="text-sm">{{ post.createdAt | date:'yyyy-MM-dd' }}</td>
                <td>
                  <div class="flex gap-sm">
                    <a class="btn btn-sm btn-outline" [routerLink]="['/admin/posts', post.slug, 'edit']">Edit</a>
                    @if (auth.isAdmin()) { <button class="btn btn-sm btn-outline" (click)="togglePin(post.id)">{{ post.pinned ? 'Unpin' : 'Pin' }}</button> }
                    <button class="btn btn-sm btn-danger" (click)="deletePost(post.id)">Delete</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (totalPages() > 1) {
        <div class="pagination">
          <button [disabled]="page()===1" (click)="goPage(page()-1)">«</button>
          @for (p of pagesArray(); track p) { <button [class.active]="p===page()" (click)="goPage(p)">{{ p }}</button> }
          <button [disabled]="page()===totalPages()" (click)="goPage(page()+1)">»</button>
        </div>
      }
    }
  `,
})
export class PostListComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);
  posts = signal<Post[]>([]);
  loading = signal(true); page = signal(1); totalPages = signal(1);

  ngOnInit() { this.loadPosts(); }

  loadPosts() {
    this.loading.set(true);
    this.api.getPosts({ page: this.page(), page_size: 20 }).subscribe({
      next: (res) => { if (res.code === 0 && res.data) { this.posts.set(res.data.list); this.totalPages.set(Math.ceil(res.data.total / 20)); } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  togglePin(id: number) { this.api.togglePin(id).subscribe(() => this.loadPosts()); }
  deletePost(id: number) { if (confirm('Delete this post?')) { this.api.deletePost(id).subscribe(() => this.loadPosts()); } }
  goPage(p: number) { this.page.set(p); this.loadPosts(); }
  pagesArray(): number[] { return Array.from({ length: this.totalPages() }, (_, i) => i + 1); }
}
