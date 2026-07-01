import { Component, inject, signal, Input, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { Category, Tag } from '../../../core/models';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <h1 style="font-size:1.5rem;margin-bottom:1.5rem;">{{ isEdit ? 'Edit Post' : 'New Post' }}</h1>
    @if (errorMsg()) { <div class="alert alert-error">{{ errorMsg() }}</div> }
    <div class="card" style="max-width:900px;">
      <div class="form-group"><label>Title</label><input class="form-input" type="text" [(ngModel)]="title" placeholder="Post title" /></div>
      <div class="form-group"><label>Content (Markdown)</label><textarea class="form-input" [(ngModel)]="content" rows="16" placeholder="Write in Markdown..."></textarea></div>
      <div class="form-group"><label>Summary</label><input class="form-input" type="text" [(ngModel)]="summary" placeholder="Brief summary" /></div>
      <div class="form-group"><label>Cover Image URL</label><input class="form-input" type="text" [(ngModel)]="cover" placeholder="https://..." /></div>
      <div class="form-group">
        <label>Category</label>
        <select class="form-input" [(ngModel)]="categoryId">
          <option [ngValue]="undefined">No category</option>
          @for (cat of categories(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
        </select>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div class="flex gap-sm" style="flex-wrap:wrap;">
          @for (tag of allTags(); track tag.id) {
            <label style="font-weight:400;cursor:pointer;">
              <input type="checkbox" [checked]="selectedTagIds.has(tag.id)" (change)="toggleTag(tag.id)" /> {{ tag.name }}
            </label>
          }
        </div>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-input" [(ngModel)]="status" style="width:200px;">
          <option value="draft">Draft</option>
          <option value="published">Publish</option>
        </select>
      </div>
      <div class="flex gap-md mt-lg">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}</button>
        <a routerLink="/admin/posts" class="btn btn-outline">Cancel</a>
      </div>
    </div>
  `,
})
export class PostEditorComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  @Input() slug?: string;
  isEdit = false; postId: number | null = null;
  title = ''; content = ''; summary = ''; cover = ''; categoryId: number | null = null;
  selectedTagIds = new Set<number>(); status = 'draft';
  saving = signal(false); errorMsg = signal('');
  categories = signal<Category[]>([]); allTags = signal<Tag[]>([]);

  ngOnInit() {
    this.api.getCategories().subscribe(res => { if (res.code === 0 && res.data) this.categories.set(res.data); });
    this.api.getTags().subscribe(res => { if (res.code === 0 && res.data) this.allTags.set(res.data); });

    if (this.slug) {
      this.isEdit = true;
      this.api.getPost(this.slug).subscribe(res => {
        if (res.code === 0 && res.data) {
          const p = res.data;
          this.postId = p.id; this.title = p.title; this.content = p.content;
          this.summary = p.summary || ''; this.cover = p.cover || '';
          this.categoryId = p.categoryId ?? null; this.status = p.status;
          this.selectedTagIds = new Set(p.tags.map(t => t.id));
        }
      });
    }
  }

  toggleTag(tagId: number) { this.selectedTagIds.has(tagId) ? this.selectedTagIds.delete(tagId) : this.selectedTagIds.add(tagId); }

  save() {
    if (!this.title.trim()) { this.errorMsg.set('Title is required'); return; }
    this.saving.set(true);
    const data: Record<string, unknown> = {
      title: this.title, content: this.content, summary: this.summary || null,
      cover: this.cover || null, category_id: this.categoryId,
      tag_ids: Array.from(this.selectedTagIds), status: this.status,
    };
    const req = this.isEdit && this.postId ? this.api.updatePost(this.postId, data) : this.api.createPost(data);
    req.subscribe({
      next: (res) => { if (res.code === 0) this.router.navigate(['/admin/posts']); else this.errorMsg.set(res.message); this.saving.set(false); },
      error: () => { this.errorMsg.set('Failed to save'); this.saving.set(false); },
    });
  }
}
