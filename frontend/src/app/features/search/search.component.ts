import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Post } from '../../core/models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="container" style="padding-top:1.5rem;max-width:860px;">
      <div style="margin-bottom:1.5rem;">
        <input class="form-input w-full" type="text" [(ngModel)]="query"
          (keyup.enter)="doSearch()" placeholder="Search articles..."
          style="font-size:1.1rem;padding:0.75rem 1rem;" />
        @if (suggestions().length && query.length >= 2 && !searched) {
          <div class="card" style="position:absolute;width:calc(100%-2rem);z-index:10;margin-top:4px;padding:0.5rem 0;">
            @for (s of suggestions(); track s) {
              <div style="padding:0.5rem 1rem;cursor:pointer;font-size:0.9rem;" (click)="selectSuggestion(s)">{{ s }}</div>
            }
          </div>
        }
      </div>
      @if (loading()) {
        <div class="loading">Searching...</div>
      } @else if (searched && posts().length === 0) {
        <div class="card" style="text-align:center;padding:3rem;"><p class="text-muted">No results for "{{ searchedQuery }}".</p></div>
      } @else if (posts().length) {
        <p class="text-muted mb-md">{{ total() }} results for "{{ searchedQuery }}"</p>
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
export class SearchComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sub = new Subscription();

  query = '';
  searched = false;
  searchedQuery = '';
  posts = signal<Post[]>([]);
  loading = signal(false);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  suggestions = signal<string[]>([]);

  ngOnInit() {
    this.sub = this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.query = params['q'];
        this.searchedQuery = params['q'];
        this.searched = true;
        this.doSearch();
      }
    });
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  selectSuggestion(s: string) { this.query = s; this.suggestions.set([]); this.doSearch(); }

  doSearch() {
    if (!this.query.trim()) return;
    this.searched = true;
    this.searchedQuery = this.query;
    this.suggestions.set([]);
    this.router.navigate([], { queryParams: { q: this.query }, replaceUrl: true });
    this.loading.set(true);
    this.api.search(this.query, this.page()).subscribe({
      next: (res) => {
        if (res.code === 0 && res.data) {
          this.posts.set(res.data.list);
          this.total.set(res.data.total);
          this.totalPages.set(Math.ceil(res.data.total / 10));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(p: number) { this.page.set(p); this.doSearch(); }
  pagesArray(): number[] { return Array.from({ length: this.totalPages() }, (_, i) => i + 1); }
}
