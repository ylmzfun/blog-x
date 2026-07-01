import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/api.service';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">Comments</h1>
    <p class="text-muted mb-md">Note: This page shows comments for individual posts. Select a post to manage its comments.</p>
    @if (loading()) {
      <div class="loading">Loading...</div>
    } @else if (comments().length === 0) {
      <div class="card" style="text-align:center;padding:3rem;"><p class="text-muted">No comments to review.</p></div>
    } @else {
      <div class="card" style="padding:0;">
        <table class="table">
          <thead><tr><th>Author</th><th>Content</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            @for (c of comments(); track c.id) {
              <tr>
                <td>{{ c.authorName }}</td><td style="max-width:300px;word-break:break-word;">{{ c.content }}</td>
                <td><span class="badge" [style.background]="c.status==='approved'?'#d1fae5':'#fef3c7'" [style.color]="c.status==='approved'?'#065f46':'#92400e'">{{ c.status }}</span></td>
                <td class="text-sm">{{ c.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
                <td>
                  <div class="flex gap-sm">
                    @if (c.status==='pending') { <button class="btn btn-sm btn-primary" (click)="approve(c.id)">Approve</button> }
                    <button class="btn btn-sm btn-danger" (click)="deleteComment(c.id)">Delete</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CommentListComponent implements OnInit {
  private api = inject(ApiService);
  comments = signal<any[]>([]); loading = signal(true);

  ngOnInit() {
    // Load recent posts with comments — simplified admin view
    this.api.getPosts({ page: 1, page_size: 5 }).subscribe({
      next: async (res) => {
        if (res.code === 0 && res.data) {
          const allComments: any[] = [];
          for (const post of res.data.list) {
            try {
              const cr = await firstValueFrom(this.api.getComments(post.id, { page: '1', page_size: '100' }));
              if (cr?.code === 0 && cr.data) allComments.push(...cr.data.list);
            } catch { /* skip */ }
          }
          this.comments.set(allComments);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  approve(id: number) { this.api.approveComment(id).subscribe(() => { /* refresh */ }); }
  deleteComment(id: number) { if (confirm('Delete this comment?')) { this.api.deleteComment(id).subscribe(); } }
}
