import { Component, inject, signal, Input, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Post, Comment } from '../../core/models';

let markedFn: ((s: string) => Promise<string>) | null = null;
async function loadMarked(): Promise<(s: string) => Promise<string>> {
  if (!markedFn) {
    const m = await import('marked');
    markedFn = (s: string) => m.marked.parse(s) as Promise<string>;
  }
  return markedFn!;
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="container" style="padding-top:1.5rem;max-width:860px;">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else if (post(); as p) {
        <article class="card" style="margin-bottom:1.5rem;">
          @if (p.cover) {
            <img [src]="p.cover" alt="Cover" class="post-cover" style="margin-top:0;" />
          }
          <h1 style="font-size:2rem;margin-bottom:0.5rem;">{{ p.title }}</h1>
          <div class="post-meta" style="margin-bottom:1rem;">
            <span>By {{ p.authorName }}</span>
            @if (p.categoryName) {
              <a [routerLink]="['/category', p.categoryId]" class="badge">{{ p.categoryName }}</a>
            }
            <span>{{ p.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
            <span>👁 {{ p.viewCount }}</span>
          </div>
          @if (p.tags.length) {
            <div class="tag-cloud" style="margin-bottom:1rem;">
              @for (tag of p.tags; track tag.id) {
                <a [routerLink]="['/tag', tag.slug]" class="tag-item">{{ tag.name }}</a>
              }
            </div>
          }
          <div class="markdown-body" [innerHTML]="renderedContent()"></div>
        </article>

        <div class="card">
          <h2 style="font-size:1.2rem;margin-bottom:1rem;">Comments ({{ p.commentCount }})</h2>
          @if (auth.isLoggedIn()) {
            <div style="margin-bottom:1.5rem;">
              <textarea class="form-input w-full" [(ngModel)]="newComment" placeholder="Write a comment..." rows="3"></textarea>
              <button class="btn btn-primary mt-sm" (click)="submitComment()" [disabled]="!newComment.trim() || submitting()">
                {{ submitting() ? 'Posting...' : 'Post Comment' }}
              </button>
            </div>
          } @else {
            <p class="text-muted" style="margin-bottom:1rem;"><a routerLink="/login">Login</a> to leave a comment.</p>
          }
          @if (errorMsg()) { <div class="alert alert-error">{{ errorMsg() }}</div> }
          @for (comment of comments(); track comment.id) {
            <div class="comment-item" [class.comment-reply]="comment.parentId">
              <div class="flex items-center gap-sm mb-sm">
                <span class="comment-author">{{ comment.authorName }}</span>
                <span class="comment-time">{{ comment.createdAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
              <p style="font-size:0.9rem;">{{ comment.content }}</p>
              @if (auth.isLoggedIn()) {
                <button class="btn btn-sm btn-outline mt-sm" (click)="replyTo(comment.id)">Reply</button>
              }
              @if (replyTarget() === comment.id) {
                <div style="margin-top:0.5rem;margin-left:1rem;">
                  <textarea class="form-input w-full" [(ngModel)]="replyContent" rows="2" placeholder="Write a reply..."></textarea>
                  <button class="btn btn-sm btn-primary mt-sm" (click)="submitReply(comment.id)" [disabled]="!replyContent.trim()">Submit</button>
                  <button class="btn btn-sm btn-outline mt-sm" (click)="replyTarget.set(null)" style="margin-left:0.5rem;">Cancel</button>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="card" style="text-align:center;padding:3rem;"><p class="text-muted">Post not found.</p></div>
      }
    </div>
  `,
})
export class PostDetailComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  @Input() slug = '';
  post = signal<Post | null>(null);
  comments = signal<Comment[]>([]);
  loading = signal(true);
  renderedContent = signal<SafeHtml>('');
  newComment = '';
  replyTarget = signal<number | null>(null);
  replyContent = '';
  submitting = signal(false);
  errorMsg = signal('');

  async ngOnInit() {
    if (!this.slug) return;
    try {
      const res = await firstValueFrom(this.api.getPost(this.slug));
      if (res.code === 0 && res.data) {
        this.post.set(res.data);
        const markdownFn = await loadMarked();
        const html = await markdownFn(res.data.content);
        this.renderedContent.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.loadComments();
      }
    } catch { /* */ }
    this.loading.set(false);
  }

  loadComments() {
    const p = this.post();
    if (!p) return;
    this.api.getComments(p.id, { page: 1, page_size: 50 }).subscribe({
      next: (res) => {
        if (res.code === 0 && res.data) this.comments.set(this.flattenComments(res.data.list));
      },
    });
  }

  flattenComments(tree: Comment[]): Comment[] {
    const result: Comment[] = [];
    const walk = (nodes: Comment[]) => {
      for (const n of nodes) { result.push(n); if (n.children) walk(n.children); }
    };
    walk(tree);
    return result;
  }

  submitComment() {
    const p = this.post();
    if (!p || !this.newComment.trim()) return;
    this.submitting.set(true);
    this.api.createComment(p.id, { content: this.newComment }).subscribe({
      next: (res) => {
        if (res.code === 0) { this.newComment = ''; this.loadComments(); }
        else this.errorMsg.set(res.message);
        this.submitting.set(false);
      },
      error: () => { this.errorMsg.set('Failed to post comment'); this.submitting.set(false); },
    });
  }

  replyTo(id: number) { this.replyTarget.set(id); this.replyContent = ''; }

  submitReply(parentId: number) {
    const p = this.post();
    if (!p || !this.replyContent.trim()) return;
    this.api.createComment(p.id, { content: this.replyContent, parent_id: parentId }).subscribe({
      next: (res) => {
        if (res.code === 0) { this.replyTarget.set(null); this.replyContent = ''; this.loadComments(); }
      },
    });
  }
}
